/* Renders a list of key values objets

mandatory config parameters:
rows: an object container where each propery is a key-value object we want to render
       let rows = {
           keyboard: {
               header: gettext('Keyboard Layout'),
               editor: 'Your.KeyboardEdit',
               required: true
           },

optional:
disabled: setting this parameter to true will disable selection and focus on the
proxmoxObjectGrid as well as greying out input elements.
Useful for a readonly tabular display

*/

Ext.define('Proxmox.grid.ObjectGrid', {
    extend: 'Ext.grid.GridPanel',
    alias: ['widget.proxmoxObjectGrid'],

    // can be used as declarative replacement over manually calling the add_XYZ_row helpers,
    // see top-level doc-comment above for details/example
    gridRows: [],

    disabled: false,
    hideHeaders: true,

    monStoreErrors: false,

    add_combobox_row: function(name, text, opts) {
	let me = this;

	opts = opts || {};
	me.rows = me.rows || {};

	me.rows[name] = {
	    required: true,
	    defaultValue: opts.defaultValue,
	    header: text,
	    renderer: opts.renderer,
	    editor: {
		xtype: 'proxmoxWindowEdit',
		subject: text,
		onlineHelp: opts.onlineHelp,
		fieldDefaults: {
		    labelWidth: opts.labelWidth || 100,
		},
		items: {
		    xtype: 'proxmoxKVComboBox',
		    name: name,
		    comboItems: opts.comboItems,
		    value: opts.defaultValue,
		    deleteEmpty: !!opts.deleteEmpty,
		    emptyText: opts.defaultValue,
		    labelWidth: Proxmox.Utils.compute_min_label_width(
			text, opts.labelWidth),
		    fieldLabel: text,
		},
	    },
	};
    },

    add_text_row: function(name, text, opts) {
	let me = this;

	opts = opts || {};
	me.rows = me.rows || {};

	me.rows[name] = {
	    required: true,
	    defaultValue: opts.defaultValue,
	    header: text,
	    renderer: opts.renderer,
	    editor: {
		xtype: 'proxmoxWindowEdit',
		subject: text,
		onlineHelp: opts.onlineHelp,
		fieldDefaults: {
		    labelWidth: opts.labelWidth || 100,
		},
		items: {
		    xtype: 'proxmoxtextfield',
		    name: name,
		    deleteEmpty: !!opts.deleteEmpty,
		    emptyText: opts.defaultValue,
		    labelWidth: Proxmox.Utils.compute_min_label_width(
			text, opts.labelWidth),
		    vtype: opts.vtype,
		    fieldLabel: text,
		},
	    },
	};
    },

    add_boolean_row: function(name, text, opts) {
	let me = this;

	opts = opts || {};
	me.rows = me.rows || {};

	me.rows[name] = {
	    required: true,
	    defaultValue: opts.defaultValue || 0,
	    header: text,
	    renderer: opts.renderer || Proxmox.Utils.format_boolean,
	    editor: {
		xtype: 'proxmoxWindowEdit',
		subject: text,
		onlineHelp: opts.onlineHelp,
		fieldDefaults: {
		    labelWidth: opts.labelWidth || 100,
		},
		items: {
		    xtype: 'proxmoxcheckbox',
		    name: name,
		    uncheckedValue: 0,
		    defaultValue: opts.defaultValue || 0,
		    checked: !!opts.defaultValue,
		    deleteDefaultValue: !!opts.deleteDefaultValue,
		    labelWidth: Proxmox.Utils.compute_min_label_width(
			text, opts.labelWidth),
		    fieldLabel: text,
		},
	    },
	};
    },

    add_integer_row: function(name, text, opts) {
	let me = this;

	opts = opts || {};
	me.rows = me.rows || {};

	me.rows[name] = {
	    required: true,
	    defaultValue: opts.defaultValue,
	    header: text,
	    renderer: opts.renderer,
	    editor: {
		xtype: 'proxmoxWindowEdit',
		subject: text,
		onlineHelp: opts.onlineHelp,
		fieldDefaults: {
		    labelWidth: opts.labelWidth || 100,
		},
		items: {
		    xtype: 'proxmoxintegerfield',
		    name: name,
		    minValue: opts.minValue,
		    maxValue: opts.maxValue,
		    emptyText: gettext('Default'),
		    deleteEmpty: !!opts.deleteEmpty,
		    value: opts.defaultValue,
		    labelWidth: Proxmox.Utils.compute_min_label_width(
			text, opts.labelWidth),
		    fieldLabel: text,
		},
	    },
	};
    },

    editorConfig: {}, // default config passed to editor

    run_editor: function() {
	let me = this;

	let sm = me.getSelectionModel();
	let rec = sm.getSelection()[0];
	if (!rec) {
	    return;
	}

	let rows = me.rows;
	let rowdef = rows[rec.data.key];
	if (!rowdef.editor) {
	    return;
	}

	let win;
	let config;
	if (Ext.isString(rowdef.editor)) {
	    config = Ext.apply({
		confid: rec.data.key,
	    }, me.editorConfig);
	    win = Ext.create(rowdef.editor, config);
	} else {
	    config = Ext.apply({
		confid: rec.data.key,
	    }, me.editorConfig);
	    Ext.apply(config, rowdef.editor);
	    win = Ext.createWidget(rowdef.editor.xtype, config);
	    win.load();
	}

	win.show();
	win.on('destroy', me.reload, me);
    },

    reload: function() {
	let me = this;
	me.rstore.load();
    },

    getObjectValue: function(key, defaultValue) {
	let me = this;
	let rec = me.store.getById(key);
	if (rec) {
	    return rec.data.value;
	}
	return defaultValue;
    },

    renderKey: function(key, metaData, record, rowIndex, colIndex, store) {
	let me = this;
	let rows = me.rows;
	let rowdef = rows && rows[key] ? rows[key] : {};
	return rowdef.header || key;
    },

    renderValue: function(value, metaData, record, rowIndex, colIndex, store) {
	let me = this;
	let rows = me.rows;
	let key = record.data.key;
	let rowdef = rows && rows[key] ? rows[key] : {};

	let renderer = rowdef.renderer;
	if (renderer) {
	    return renderer(value, metaData, record, rowIndex, colIndex, store);
	}

	return value;
    },

    listeners: {
	itemkeydown: function(view, record, item, index, e) {
	    if (e.getKey() === e.ENTER) {
		this.pressedIndex = index;
	    }
	},
	itemkeyup: function(view, record, item, index, e) {
	    if (e.getKey() === e.ENTER && index === this.pressedIndex) {
		this.run_editor();
	    }

	    this.pressedIndex = undefined;
	},
    },

    initComponent: function() {
	let me = this;

	for (const rowdef of me.gridRows || []) {
	    let addFn = me[`add_${rowdef.xtype}_row`];
	    if (typeof addFn !== 'function') {
		throw `unknown object-grid row xtype '${rowdef.xtype}'`;
	    } else if (typeof rowdef.name !== 'string') {
		throw `object-grid row need a valid name string-property!`;
	    } else {
		addFn.call(me, rowdef.name, rowdef.text || rowdef.name, rowdef);
	    }
	}

	let rows = me.rows;

	if (!me.rstore) {
	    if (!me.url) {
		throw "no url specified";
	    }

	    me.rstore = Ext.create('Proxmox.data.ObjectStore', {
		url: me.url,
		interval: me.interval,
		extraParams: me.extraParams,
		rows: me.rows,
	    });
	}

	let rstore = me.rstore;
	let store = Ext.create('Proxmox.data.DiffStore', {
	    rstore: rstore,
	    sorters: [],
	    filters: [],
	});

	if (rows) {
	    for (const [key, rowdef] of Object.entries(rows)) {
		if (Ext.isDefined(rowdef.defaultValue)) {
		    store.add({ key: key, value: rowdef.defaultValue });
		} else if (rowdef.required) {
		    store.add({ key: key, value: undefined });
		}
	    }
	}

	if (me.sorterFn) {
	    store.sorters.add(Ext.create('Ext.util.Sorter', {
		sorterFn: me.sorterFn,
	    }));
	}

	store.filters.add(Ext.create('Ext.util.Filter', {
	    filterFn: function(item) {
		if (rows) {
		    let rowdef = rows[item.data.key];
		    if (!rowdef || rowdef.visible === false) {
			return false;
		    }
		}
		return true;
	    },
	}));

	Proxmox.Utils.monStoreErrors(me, rstore);

	Ext.applyIf(me, {
	    store: store,
	    stateful: false,
	    columns: [
		{
		    header: gettext('Name'),
		    width: me.cwidth1 || 200,
		    dataIndex: 'key',
		    renderer: me.renderKey,
		},
		{
		    flex: 1,
		    header: gettext('Value'),
		    dataIndex: 'value',
		    renderer: me.renderValue,
		},
	    ],
	});

	me.callParent();

	if (me.monStoreErrors) {
	    Proxmox.Utils.monStoreErrors(me, me.store);
	}
   },
});

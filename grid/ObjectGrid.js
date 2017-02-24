/* Renders a list of key values objets

mandatory config parameters:
rows: an object container where each propery is a key-value object we want to render
       var rows = {
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
    disabled: false,
    hideHeaders: true,

    editorConfig: {}, // default config passed to editor

    run_editor: function() {
	var me = this;

	var sm = me.getSelectionModel();
	var rec = sm.getSelection()[0];
	if (!rec) {
	    return;
	}

	var rows = me.rows;
	var rowdef = rows[rec.data.key];
	if (!rowdef.editor) {
	    return;
	}

	var win;
	var config;
	if (Ext.isString(rowdef.editor)) {
	    config = Ext.apply({
		confid: rec.data.key,
	    },  me.editorConfig);
	    win = Ext.create(rowdef.editor, config);
	} else {
	    config = Ext.apply({
		confid: rec.data.key,
	    },  me.editorConfig);
	    Ext.apply(config, rowdef.editor);
	    win = Ext.createWidget(rowdef.editor.xtype, config);
	    win.load();
	}

	win.show();
	win.on('destroy', me.reload, me);
    },

    reload: function() {
	var me = this;
	me.rstore.load();
    },

    getObjectValue: function(key, defaultValue) {
	var me = this;
	var rec = me.store.getById(key);
	if (rec) {
	    return rec.data.value;
	}
	return defaultValue;
    },

    renderKey: function(key, metaData, record, rowIndex, colIndex, store) {
	var me = this;
	var rows = me.rows;
	var rowdef = (rows && rows[key]) ?  rows[key] : {};
	return rowdef.header || key;
    },

    renderValue: function(value, metaData, record, rowIndex, colIndex, store) {
	var me = this;
	var rows = me.rows;
	var key = record.data.key;
	var rowdef = (rows && rows[key]) ?  rows[key] : {};

	var renderer = rowdef.renderer;
	if (renderer) {
	    return renderer(value, metaData, record, rowIndex, colIndex, store);
	}

	return value;
    },

    initComponent : function() {
	var me = this;

	var rows = me.rows;

	if (!me.rstore) {
	    if (!me.url) {
		throw "no url specified";
	    }

	    me.rstore = Ext.create('Proxmox.data.ObjectStore', {
		url: me.url,
		interval: me.interval,
		extraParams: me.extraParams,
		rows: me.rows
	    });
	}

	var rstore = me.rstore;

	var store = Ext.create('Proxmox.data.DiffStore', { rstore: rstore,
	    sorters: [],
	    filters: []
	});

	if (rows) {
	    Ext.Object.each(rows, function(key, rowdef) {
		if (Ext.isDefined(rowdef.defaultValue)) {
		    store.add({ key: key, value: rowdef.defaultValue });
		} else if (rowdef.required) {
		    store.add({ key: key, value: undefined });
		}
	    });
	}

	if (me.sorterFn) {
	    store.sorters.add(Ext.create('Ext.util.Sorter', {
		sorterFn: me.sorterFn
	    }));
	}

	store.filters.add(Ext.create('Ext.util.Filter', {
	    filterFn: function(item) {
		if (rows) {
		    var rowdef = rows[item.data.key];
		    if (!rowdef || (rowdef.visible === false)) {
			return false;
		    }
		}
		return true;
	    }
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
		    renderer: me.renderKey
		},
		{
		    flex: 1,
		    header: gettext('Value'),
		    dataIndex: 'value',
		    renderer: me.renderValue
		}
	    ]
	});

	me.callParent();
   }
});

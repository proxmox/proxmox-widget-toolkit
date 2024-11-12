Ext.define('Proxmox.panel.WebhookEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxWebhookEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],
    onlineHelp: 'notification_targets_webhook',

    type: 'webhook',

    columnT: [

    ],

    column1: [
	{
	    xtype: 'pmxDisplayEditField',
	    name: 'name',
	    cbind: {
		value: '{name}',
		editable: '{isCreate}',
	    },
	    fieldLabel: gettext('Endpoint Name'),
	    regex: Proxmox.Utils.safeIdRegex,
	    allowBlank: false,
	},
    ],

    column2: [
	{
	    xtype: 'proxmoxcheckbox',
	    name: 'enable',
	    fieldLabel: gettext('Enable'),
	    allowBlank: false,
	    checked: true,
	},
    ],

    columnB: [
	{
	    xtype: 'fieldcontainer',
	    fieldLabel: gettext('Method/URL'),
	    layout: 'hbox',
	    border: false,
	    margin: '0 0 5 0',
	    items: [
		{
		    xtype: 'proxmoxKVComboBox',
		    name: 'method',
		    editable: false,
		    value: 'post',
		    comboItems: [
			['post', 'POST'],
			['put', 'PUT'],
			['get', 'GET'],
		    ],
		    width: 80,
		    margin: '0 5 0 0',
		},
		{
		    xtype: 'proxmoxtextfield',
		    name: 'url',
		    allowBlank: false,
		    emptyText: "https://example.com/hook",
		    regex: Proxmox.Utils.httpUrlRegex,
		    regexText: gettext('Must be a valid URL'),
		    flex: 4,
		},
	    ],
	},
	{
	    xtype: 'pmxWebhookKeyValueList',
	    name: 'header',
	    fieldLabel: gettext('Headers'),
	    subject: gettext('Header'),
	    maskValues: false,
	    cbind: {
		isCreate: '{isCreate}',
	    },
	    margin: '0 0 10 0',
	},
	{
	    xtype: 'textarea',
	    fieldLabel: gettext('Body'),
	    name: 'body',
	    allowBlank: true,
	    minHeight: '150',
	    fieldStyle: {
		'font-family': 'monospace',
	    },
	    margin: '0 0 5 0',
	},
	{
	    xtype: 'pmxWebhookKeyValueList',
	    name: 'secret',
	    fieldLabel: gettext('Secrets'),
	    subject: gettext('Secret'),
	    maskValues: true,
	    cbind: {
		isCreate: '{isCreate}',
	    },
	    margin: '0 0 10 0',
	},
	{
	    xtype: 'proxmoxtextfield',
	    name: 'comment',
	    fieldLabel: gettext('Comment'),
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	},
    ],

    onSetValues: (values) => {
	values.enable = !values.disable;

	if (values.body) {
	    values.body = Proxmox.Utils.base64ToUtf8(values.body);
	}

	delete values.disable;
	return values;
    },

    onGetValues: function(values) {
	let me = this;

	if (values.enable) {
	    if (!me.isCreate) {
		Proxmox.Utils.assemble_field_data(values, { 'delete': 'disable' });
	    }
	} else {
	    values.disable = 1;
	}

	if (values.body) {
	    values.body = Proxmox.Utils.utf8ToBase64(values.body);
	} else {
	    delete values.body;
	    if (!me.isCreate) {
		Proxmox.Utils.assemble_field_data(values, { 'delete': 'body' });
	    }
	}

	if (Ext.isArray(values.header) && !values.header.length) {
	    delete values.header;
	    if (!me.isCreate) {
		Proxmox.Utils.assemble_field_data(values, { 'delete': 'header' });
	    }
	}

	if (Ext.isArray(values.secret) && !values.secret.length) {
	    delete values.secret;
	    if (!me.isCreate) {
		Proxmox.Utils.assemble_field_data(values, { 'delete': 'secret' });
	    }
	}
	delete values.enable;

	return values;
    },
});

Ext.define('Proxmox.form.WebhookKeyValueList', {
    extend: 'Ext.form.FieldContainer',
    alias: 'widget.pmxWebhookKeyValueList',

    mixins: [
	'Ext.form.field.Field',
    ],

    // override for column header
    fieldTitle: gettext('Item'),

    // the text for a single element, used for the add button
    subject: undefined,

    // will be applied to the textfields
    maskRe: undefined,

    allowBlank: true,
    selectAll: false,
    isFormField: true,
    deleteEmpty: false,
    config: {
	deleteEmpty: false,
	maskValues: false,
    },

    setValue: function(list) {
	let me = this;

	list = Ext.isArray(list) ? list : (list ?? '').split(';').filter(t => t !== '');

	let store = me.lookup('grid').getStore();
	if (list.length > 0) {
	    store.setData(list.map(item => {
		let properties = Proxmox.Utils.parsePropertyString(item);

		// decode base64
		let value = me.maskValues ? '' : Proxmox.Utils.base64ToUtf8(properties.value);

		let obj = {
		    headerName: properties.name,
		    headerValue: value,
		};

		if (!me.isCreate && me.maskValues) {
		    obj.emptyText = gettext('Unchanged');
		}

		return obj;
	    }));
	} else {
	    store.removeAll();
	}
	me.checkChange();
	return me;
    },

    getValue: function() {
	let me = this;
	let values = [];
	me.lookup('grid').getStore().each((rec) => {
	    if (rec.data.headerName) {
		let obj = {
		    name: rec.data.headerName,
		    value: Proxmox.Utils.utf8ToBase64(rec.data.headerValue),
		};

		values.push(Proxmox.Utils.printPropertyString(obj));
	    }
	});

	return values;
    },

    getErrors: function(value) {
	let me = this;
	let empty = false;

	me.lookup('grid').getStore().each((rec) => {
	    if (!rec.data.headerName) {
		empty = true;
	    }

	    if (!rec.data.headerValue && rec.data.newValue) {
		empty = true;
	    }

	    if (!rec.data.headerValue && !me.maskValues) {
		empty = true;
	    }
	});
	if (empty) {
	    return [gettext('Name/value must not be empty.')];
	}
	return [];
    },

    // override framework function to implement deleteEmpty behaviour
    getSubmitData: function() {
	let me = this,
	    data = null,
	    val;
	if (!me.disabled && me.submitValue) {
	    val = me.getValue();
	    if (val !== null && val !== '') {
		data = {};
		data[me.getName()] = val;
	    } else if (me.getDeleteEmpty()) {
		data = {};
		data.delete = me.getName();
	    }
	}
	return data;
    },

    controller: {
	xclass: 'Ext.app.ViewController',

	addLine: function() {
	    let me = this;
	    me.lookup('grid').getStore().add({
		headerName: '',
		headerValue: '',
		emptyText: gettext('Value'),
		newValue: true,
	    });
	},

	removeSelection: function(field) {
	    let me = this;
	    let view = me.getView();
	    let grid = me.lookup('grid');

	    let record = field.getWidgetRecord();
	    if (record === undefined) {
		// this is sometimes called before a record/column is initialized
		return;
	    }

	    grid.getStore().remove(record);
	    view.checkChange();
	    view.validate();
	},

	itemChange: function(field, newValue) {
	    let rec = field.getWidgetRecord();
	    if (!rec) {
		return;
	    }

	    let column = field.getWidgetColumn();
	    rec.set(column.dataIndex, newValue);
	    let list = field.up('pmxWebhookKeyValueList');
	    list.checkChange();
	    list.validate();
	},

	control: {
	    'grid button': {
		click: 'removeSelection',
	    },
	},
    },

    initComponent: function() {
	let me = this;

	let items = [
	    {
		xtype: 'grid',
		reference: 'grid',
		minHeight: 100,
		maxHeight: 100,
		scrollable: 'vertical',

		viewConfig: {
		    deferEmptyText: false,
		},

		store: {
		    listeners: {
			update: function() {
			    this.commitChanges();
			},
		    },
		},
		margin: '5 0 5 0',
		columns: [
		    {
			header: me.fieldTtitle,
			dataIndex: 'headerName',
			xtype: 'widgetcolumn',
			widget: {
			    xtype: 'textfield',
			    isFormField: false,
			    maskRe: me.maskRe,
			    allowBlank: false,
			    queryMode: 'local',
			    emptyText: gettext('Key'),
			    listeners: {
				change: 'itemChange',
			    },
			},
			flex: 1,
		    },
		    {
			header: me.fieldTtitle,
			dataIndex: 'headerValue',
			xtype: 'widgetcolumn',
			widget: {
			    xtype: 'proxmoxtextfield',
			    inputType: me.maskValues ? 'password' : 'text',
			    isFormField: false,
			    maskRe: me.maskRe,
			    queryMode: 'local',
			    listeners: {
				change: 'itemChange',
			    },
			    allowBlank: !me.isCreate && me.maskValues,

			    bind: {
				emptyText: '{record.emptyText}',
			    },
			},
			flex: 1,
		    },
		    {
			xtype: 'widgetcolumn',
			width: 40,
			widget: {
			    xtype: 'button',
			    iconCls: 'fa fa-trash-o',
			},
		    },
		],
	    },
	    {
		xtype: 'button',
		text: me.subject ? Ext.String.format(gettext('Add {0}'), me.subject) : gettext('Add'),
		iconCls: 'fa fa-plus-circle',
		handler: 'addLine',
	    },
	];

	for (const [key, value] of Object.entries(me.gridConfig ?? {})) {
	    items[0][key] = value;
	}

	Ext.apply(me, {
	    items,
	});

	me.callParent();
	me.initField();
    },
});

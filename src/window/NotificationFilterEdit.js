Ext.define('Proxmox.panel.NotificationFilterEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxNotificationFilterEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    items: [
	{
	    xtype: 'pmxDisplayEditField',
	    name: 'name',
	    cbind: {
		value: '{name}',
		editable: '{isCreate}',
	    },
	    fieldLabel: gettext('Filter Name'),
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxKVComboBox',
	    name: 'min-severity',
	    fieldLabel: gettext('Minimum Severity'),
	    value: null,
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	    comboItems: [
		['info', 'info'],
		['notice', 'notice'],
		['warning', 'warning'],
		['error', 'error'],
	    ],
	    triggers: {
		clear: {
		    cls: 'pmx-clear-trigger',
		    weight: -1,
		    hidden: false,
		    handler: function() {
			this.setValue('');
		    },
		},
	    },
	},
	{
	    xtype: 'proxmoxcheckbox',
	    fieldLabel: gettext('Invert match'),
	    name: 'invert-match',
	    uncheckedValue: 0,
	    defaultValue: 0,
	    cbind: {
		deleteDefaultValue: '{!isCreate}',
	    },
	},
	{
	    xtype: 'pmxNotificationTargetSelector',
	    name: 'target',
	    allowBlank: false,
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
});

Ext.define('Proxmox.window.NotificationFilterEdit', {
    extend: 'Proxmox.window.Edit',

    isAdd: true,

    fieldDefaults: {
	labelWidth: 120,
    },

    width: 500,

    initComponent: function() {
	let me = this;

	me.isCreate = !me.name;

	if (!me.baseUrl) {
	    throw "baseUrl not set";
	}

	me.url = `/api2/extjs${me.baseUrl}/filters`;

	if (me.isCreate) {
	    me.method = 'POST';
	} else {
	    me.url += `/${me.name}`;
	    me.method = 'PUT';
	}

	me.subject = gettext('Notification Filter');

	Ext.apply(me, {
	    items: [{
		name: me.name,
		xtype: 'pmxNotificationFilterEditPanel',
		isCreate: me.isCreate,
		baseUrl: me.baseUrl,
	    }],
	});

	me.callParent();

	if (!me.isCreate) {
	    me.load();
	}
    },
});

Ext.define('Proxmox.form.NotificationTargetSelector', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pmxNotificationTargetSelector',

    mixins: {
	field: 'Ext.form.field.Field',
    },

    padding: '0 0 10 0',

    allowBlank: true,
    selectAll: false,
    isFormField: true,

    store: {
	autoLoad: true,
	model: 'proxmox-notification-endpoints',
	sorters: 'name',
    },

    columns: [
	{
	    header: gettext('Target Name'),
	    dataIndex: 'name',
	    flex: 1,
	},
	{
	    header: gettext('Type'),
	    dataIndex: 'type',
	    flex: 1,
	},
	{
	    header: gettext('Comment'),
	    dataIndex: 'comment',
	    flex: 3,
	},
    ],

    selModel: {
	selType: 'checkboxmodel',
	mode: 'SIMPLE',
    },

    checkChangeEvents: [
	'selectionchange',
	'change',
    ],

    listeners: {
	selectionchange: function() {
	    // to trigger validity and error checks
	    this.checkChange();
	},
    },

    getSubmitData: function() {
	let me = this;
	let res = {};
	res[me.name] = me.getValue();
	return res;
    },

    getValue: function() {
	let me = this;
	if (me.savedValue !== undefined) {
	    return me.savedValue;
	}
	let sm = me.getSelectionModel();
	return (sm.getSelection() ?? []).map(item => item.data.name);
    },

    setValueSelection: function(value) {
	let me = this;

	let store = me.getStore();

	let notFound = [];
	let selection = value.map(item => {
	    let found = store.findRecord('name', item, 0, false, true, true);
	    if (!found) {
		notFound.push(item);
	    }
	    return found;
	}).filter(r => r);

	for (const name of notFound) {
	    let rec = store.add({
		name,
		type: '-',
		comment: gettext('Included target does not exist!'),
	    });
	    selection.push(rec[0]);
	}

	let sm = me.getSelectionModel();
	if (selection.length) {
	    sm.select(selection);
	} else {
	    sm.deselectAll();
	}
	// to correctly trigger invalid class
	me.getErrors();
    },

    setValue: function(value) {
	let me = this;

	let store = me.getStore();
	if (!store.isLoaded()) {
	    me.savedValue = value;
	    store.on('load', function() {
		me.setValueSelection(value);
		delete me.savedValue;
	    }, { single: true });
	} else {
	    me.setValueSelection(value);
	}
	return me.mixins.field.setValue.call(me, value);
    },

    getErrors: function(value) {
	let me = this;
	if (!me.isDisabled() && me.allowBlank === false &&
	    me.getSelectionModel().getCount() === 0) {
	    me.addBodyCls(['x-form-trigger-wrap-default', 'x-form-trigger-wrap-invalid']);
	    return [gettext('No target selected')];
	}

	me.removeBodyCls(['x-form-trigger-wrap-default', 'x-form-trigger-wrap-invalid']);
	return [];
    },

    initComponent: function() {
	let me = this;
	me.callParent();
	me.initField();
    },

});

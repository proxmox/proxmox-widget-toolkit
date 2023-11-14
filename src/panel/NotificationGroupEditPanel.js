Ext.define('Proxmox.panel.NotificationGroupEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxNotificationGroupEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    type: 'group',

    items: [
	{
	    xtype: 'pmxDisplayEditField',
	    name: 'name',
	    cbind: {
		value: '{name}',
		editable: '{isCreate}',
	    },
	    fieldLabel: gettext('Group Name'),
	    allowBlank: false,
	},
	{
	    xtype: 'pmxNotificationEndpointSelector',
	    name: 'endpoint',
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

Ext.define('Proxmox.form.NotificationEndpointSelector', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pmxNotificationEndpointSelector',

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
	filters: item => item.data.type !== 'group',
    },

    columns: [
	{
	    header: gettext('Endpoint Name'),
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
		comment: gettext('Included endpoint does not exist!'),
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
	    return [gettext('No endpoint selected')];
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

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

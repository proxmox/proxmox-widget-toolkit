Ext.define('Proxmox.panel.GotifyEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxGotifyEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    type: 'gotify',

    items: [
	{
	    xtype: 'pmxDisplayEditField',
	    name: 'name',
	    cbind: {
		value: '{name}',
		editable: '{isCreate}',
	    },
	    fieldLabel: gettext('Endpoint Name'),
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('Server URL'),
	    name: 'server',
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxtextfield',
	    inputType: 'password',
	    fieldLabel: gettext('API Token'),
	    name: 'token',
	    cbind: {
		emptyText: get => !get('isCreate') ? gettext('Unchanged') : '',
		allowBlank: '{!isCreate}',
	    },
	},
	{
	    xtype: 'pmxNotificationFilterSelector',
	    name: 'filter',
	    fieldLabel: gettext('Filter'),
	    cbind: {
		deleteEmpty: '{!isCreate}',
		baseUrl: '{baseUrl}',
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

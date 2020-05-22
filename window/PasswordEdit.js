Ext.define('Proxmox.window.PasswordEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'proxmoxWindowPasswordEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    subject: gettext('Password'),

    url: '/api2/extjs/access/password',

    fieldDefaults: {
	labelWidth: 120,
    },

    items: [
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Password'),
	    minLength: 5,
	    allowBlank: false,
	    name: 'password',
	    listeners: {
		change: (field) => field.next().validate(),
		blur: (field) => field.next().validate(),
	    },
	},
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Confirm password'),
	    name: 'verifypassword',
	    allowBlank: false,
	    vtype: 'password',
	    initialPassField: 'password',
	    submitValue: false,
	},
	{
	    xtype: 'hiddenfield',
	    name: 'userid',
	    cbind: {
		value: '{userid}',
	    },
	},
    ],
});

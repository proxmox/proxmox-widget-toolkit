Ext.define('Proxmox.window.PasswordEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'proxmoxWindowPasswordEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    subject: gettext('Password'),

    url: '/api2/extjs/access/password',

    width: 380,
    fieldDefaults: {
	labelWidth: 150,
    },

    // allow products to opt-in as their API gains support for this.
    confirmCurrentPassword: false,

    items: [
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Your Current Password'),
	    reference: 'confirmation-password',
	    name: 'confirmation-password',
	    allowBlank: false,
	    vtype: 'password',
	    cbind: {
		hidden: '{!confirmCurrentPassword}',
		disabled: '{!confirmCurrentPassword}',
	    },
	},
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('New Password'),
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
	    fieldLabel: gettext('Confirm New Password'),
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

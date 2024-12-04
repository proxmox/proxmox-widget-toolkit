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

    // specifies the minimum length of *new* passwords so this can be
    // adapted by each product as limits are changed there.
    minLength: 5,

    // allow products to opt-in as their API gains support for this.
    confirmCurrentPassword: false,

    hintHtml: undefined,

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
	    allowBlank: false,
	    name: 'password',
	    listeners: {
		change: (field) => field.next().validate(),
		blur: (field) => field.next().validate(),
	    },
	    cbind: {
		minLength: '{minLength}',
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
	    xtype: 'component',
	    userCls: 'pmx-hint',
	    name: 'password-hint',
	    hidden: true,
	    //padding: '5 1',
	    cbind: {
		html: '{hintHtml}',
		hidden: '{!hintHtml}',
	    },
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

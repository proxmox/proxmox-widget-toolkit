Ext.define('Proxmox.window.PasswordEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'proxmoxWindowPasswordEdit',

    subject: gettext('Password'),

    url: '/api2/extjs/access/password',

    fieldDefaults: {
	labelWidth: 120
    },

    items: [
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Password'),
	    minLength: 5,
	    name: 'password',
	    listeners: {
                change: function(field){
		    field.next().validate();
                },
                blur: function(field){
		    field.next().validate();
                }
	    }
	},
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Confirm password'),
	    name: 'verifypassword',
	    vtype: 'password',
	    initialPassField: 'password',
	    submitValue: false
	},
	{
	    xtype: 'hiddenfield',
	    name: 'userid'
	}
    ],

    initComponent : function() {
	var me = this;

	if (!me.userid) {
	    throw "no userid specified";
	}

	me.callParent();
	me.down('[name=userid]').setValue(me.userid);
    }
});

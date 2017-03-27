Ext.define('Proxmox.window.PasswordEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'proxmoxWindowPasswordEdit',

    initComponent : function() {
	var me = this;

	if (!me.userid) {
	    throw "no userid specified";
	}

	var verifypw;
	var pwfield;

	var validate_pw = function() {
	    if (verifypw.getValue() !== pwfield.getValue()) {
		return gettext("Passwords does not match");
	    }
	    return true;
	};

	verifypw = Ext.createWidget('textfield', { 
	    inputType: 'password',
	    fieldLabel: gettext('Confirm password'), 
	    name: 'verifypassword',
	    submitValue: false,
	    validator: validate_pw
	});

	pwfield = Ext.createWidget('textfield', { 
	    inputType: 'password',
	    fieldLabel: gettext('Password'), 
	    minLength: 5,
	    name: 'password',
	    validator: validate_pw
	});

	Ext.apply(me, {
	    subject: gettext('Password'),
	    url: '/api2/extjs/access/password',
	    items: [
		pwfield, verifypw,
		{
		    xtype: 'hiddenfield',
		    name: 'userid',
		    value: me.userid
		}
	    ]
	});

	me.callParent();
    }
});

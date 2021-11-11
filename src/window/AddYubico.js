Ext.define('Proxmox.window.AddYubico', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pmxAddYubico',
    mixins: ['Proxmox.Mixin.CBind'],

    onlineHelp: 'user_mgmt',

    modal: true,
    resizable: false,
    title: gettext('Add a Yubico OTP key'),
    width: 512,

    isAdd: true,
    userid: undefined,
    fixedUser: false,

    initComponent: function() {
	let me = this;
	me.url = '/api2/extjs/access/tfa/';
	me.method = 'POST';
	me.callParent();
    },

    viewModel: {
	data: {
	    valid: false,
	    userid: null,
	},
    },

    controller: {
	xclass: 'Ext.app.ViewController',

	control: {
	    'field': {
		validitychange: function(field, valid) {
		    let me = this;
		    let viewmodel = me.getViewModel();
		    let form = me.lookup('yubico_form');
		    viewmodel.set('valid', form.isValid());
		},
	    },
	    '#': {
		show: function() {
		    let me = this;
		    let view = me.getView();

		    if (Proxmox.UserName === 'root@pam') {
			view.lookup('password').setVisible(false);
			view.lookup('password').setDisabled(true);
		    }
		},
	    },
	},
    },

    items: [
	{
	    xtype: 'form',
	    reference: 'yubico_form',
	    layout: 'anchor',
	    border: false,
	    bodyPadding: 10,
	    fieldDefaults: {
		anchor: '100%',
	    },
	    items: [
		{
		    xtype: 'pmxDisplayEditField',
		    name: 'userid',
		    cbind: {
			editable: (get) => !get('fixedUser'),
			value: () => Proxmox.UserName,
		    },
		    fieldLabel: gettext('User'),
		    editConfig: {
			xtype: 'pmxUserSelector',
			allowBlank: false,
		    },
		    renderer: Ext.String.htmlEncode,
		    listeners: {
			change: function(field, newValue, oldValue) {
			    let vm = this.up('window').getViewModel();
			    vm.set('userid', newValue);
			},
		    },
		},
		{
		    xtype: 'textfield',
		    fieldLabel: gettext('Description'),
		    allowBlank: false,
		    name: 'description',
		    maxLength: 256,
		    emptyText: gettext('For example: TFA device ID, required to identify multiple factors.'),
		},
		{
		    xtype: 'textfield',
		    fieldLabel: gettext('Yubico OTP Key'),
		    emptyText: gettext('A currently valid Yubico OTP value'),
		    name: 'otp_value',
		    maxLength: 44,
		    enforceMaxLength: true,
		    regex: /^[a-zA-Z0-9]{44}$/,
		    regexText: '44 characters',
		    maskRe: /^[a-zA-Z0-9]$/,
		},
		{
		    xtype: 'textfield',
		    name: 'password',
		    reference: 'password',
		    fieldLabel: gettext('Verify Password'),
		    inputType: 'password',
		    minLength: 5,
		    allowBlank: false,
		    validateBlank: true,
		    cbind: {
			hidden: () => Proxmox.UserName === 'root@pam',
			disabled: () => Proxmox.UserName === 'root@pam',
			emptyText: () =>
			    Ext.String.format(gettext("Confirm your ({0}) password"), Proxmox.UserName),
		    },
		},
		{
		    xtype: 'box',
		    html: `<span class='pmx-hint'>${gettext('Tip:')}</span> `
			+ gettext('YubiKeys also support WebAuthn, which is often a better alternative.'),
		},
	    ],
	},
    ],

    getValues: function(dirtyOnly) {
	let me = this;

	let values = me.callParent(arguments);

	let uid = encodeURIComponent(values.userid);
	me.url = `/api2/extjs/access/tfa/${uid}`;
	delete values.userid;

	let data = {
	    description: values.description,
	    type: "yubico",
	    value: values.otp_value,
	};

	if (values.password) {
	    data.password = values.password;
	}

	return data;
    },
});

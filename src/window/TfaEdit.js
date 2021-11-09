Ext.define('Proxmox.window.TfaEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pmxTfaEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    onlineHelp: 'user_mgmt',

    modal: true,
    resizable: false,
    title: gettext("Modify a TFA entry's description"),
    width: 512,

    layout: {
	type: 'vbox',
	align: 'stretch',
    },

    cbindData: function(initialConfig) {
	let me = this;

	let tfa_id = initialConfig['tfa-id'];
	me.tfa_id = tfa_id;
	me.defaultFocus = 'textfield[name=description]';
	me.url = `/api2/extjs/access/tfa/${tfa_id}`;
	me.method = 'PUT';
	me.autoLoad = true;
	return {};
    },

    initComponent: function() {
	let me = this;
	me.callParent();

	if (Proxmox.UserName === 'root@pam') {
	    me.lookup('password').setVisible(false);
	    me.lookup('password').setDisabled(true);
	}

	let userid = me.tfa_id.split('/')[0];
	me.lookup('userid').setValue(userid);
    },

    items: [
	{
	    xtype: 'displayfield',
	    reference: 'userid',
	    editable: false,
	    fieldLabel: gettext('User'),
	    editConfig: {
		xtype: 'pmxUserSelector',
		allowBlank: false,
	    },
	    cbind: {
		value: () => Proxmox.UserName,
	    },
	},
	{
	    xtype: 'proxmoxtextfield',
	    name: 'description',
	    allowBlank: false,
	    fieldLabel: gettext('Description'),
	},
	{
	    xtype: 'proxmoxcheckbox',
	    fieldLabel: gettext('Enabled'),
	    name: 'enable',
	    uncheckedValue: 0,
	    defaultValue: 1,
	    checked: true,
	},
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Password'),
	    minLength: 5,
	    reference: 'password',
	    name: 'password',
	    allowBlank: false,
	    validateBlank: true,
	    emptyText: gettext('verify current password'),
	},
    ],

    getValues: function() {
	var me = this;

	var values = me.callParent(arguments);

	delete values.userid;

	return values;
    },
});

Ext.define('Proxmox.tfa.confirmRemove', {
    extend: 'Proxmox.window.Edit',
    mixins: ['Proxmox.Mixin.CBind'],

    title: gettext("Confirm TFA Removal"),

    modal: true,
    resizable: false,
    width: 600,
    isCreate: true, // logic
    isRemove: true,

    url: '/access/tfa',

    initComponent: function() {
	let me = this;

	if (typeof me.type !== "string") {
	    throw "missing type";
	}

	if (!me.callback) {
	    throw "missing callback";
	}

	me.callParent();

	if (Proxmox.UserName === 'root@pam') {
	    me.lookup('password').setVisible(false);
	    me.lookup('password').setDisabled(true);
	}
    },

    submit: function() {
	let me = this;
	if (Proxmox.UserName === 'root@pam') {
	    me.callback(null);
	} else {
	    me.callback(me.lookup('password').getValue());
	}
	me.close();
    },

    items: [
	{
	    xtype: 'box',
	    padding: '0 0 10 0',
	    html: Ext.String.format(
	        gettext('Are you sure you want to remove this {0} entry?'),
	        'TFA',
	    ),
	},
	{
	    xtype: 'container',
	    layout: {
		type: 'hbox',
		align: 'begin',
	    },
	    defaults: {
		border: false,
		layout: 'anchor',
		flex: 1,
		padding: 5,
	    },
	    items: [
		{
		    xtype: 'container',
		    layout: {
			type: 'vbox',
		    },
		    padding: '0 10 0 0',
		    items: [
			{
			    xtype: 'displayfield',
			    fieldLabel: gettext('User'),
			    cbind: {
				value: '{userid}',
			    },
			},
			{
			    xtype: 'displayfield',
			    fieldLabel: gettext('Type'),
			    cbind: {
				value: '{type}',
			    },
			},
		    ],
		},
		{
		    xtype: 'container',
		    layout: {
			type: 'vbox',
		    },
		    padding: '0 0 0 10',
		    items: [
			{
			    xtype: 'displayfield',
			    fieldLabel: gettext('Created'),
			    renderer: v => Proxmox.Utils.render_timestamp(v),
			    cbind: {
				value: '{created}',
			    },
			},
			{
			    xtype: 'textfield',
			    fieldLabel: gettext('Description'),
			    cbind: {
				value: '{description}',
			    },
			    emptyText: Proxmox.Utils.NoneText,
			    submitValue: false,
			    editable: false,
			},
		    ],
		},
	    ],
	},
	{
	    xtype: 'textfield',
	    inputType: 'password',
	    fieldLabel: gettext('Password'),
	    minLength: 5,
	    reference: 'password',
	    name: 'password',
	    allowBlank: false,
	    validateBlank: true,
	    padding: '10 0 0 0',
	    cbind: {
		emptyText: () =>
		    Ext.String.format(gettext("Confirm your ({0}) password"), Proxmox.UserName),
	    },
	},
    ],
});

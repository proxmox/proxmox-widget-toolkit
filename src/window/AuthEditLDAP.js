
Ext.define('Proxmox.panel.LDAPInputPanelViewModel', {
    extend: 'Ext.app.ViewModel',

    alias: 'viewmodel.pmxAuthLDAPPanel',

    data: {
	mode: 'ldap',
	anonymous_search: 1,
    },

    formulas: {
	tls_enabled: function(get) {
	    return get('mode') !== 'ldap';
	},
    },

});


Ext.define('Proxmox.panel.LDAPInputPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxAuthLDAPPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    viewModel: {
	type: 'pmxAuthLDAPPanel',
    },

    type: 'ldap',

    onGetValues: function(values) {
	if (this.isCreate) {
	    values.type = this.type;
	}

	if (values.anonymous_search) {
	    if (!values.delete) {
		values.delete = [];
	    }

	    if (!Array.isArray(values.delete)) {
		let tmp = values.delete;
		values.delete = [];
		values.delete.push(tmp);
	    }

	    values.delete.push("bind-dn");
	    values.delete.push("password");
	}

	delete values.anonymous_search;

	return values;
    },

    onSetValues: function(values) {
	values.anonymous_search = values["bind-dn"] ? 0 : 1;

	return values;
    },


    column1: [
	{
	    xtype: 'pmxDisplayEditField',
	    name: 'realm',
	    cbind: {
		value: '{realm}',
		editable: '{isCreate}',
	    },
	    fieldLabel: gettext('Realm'),
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('Base Domain Name'),
	    name: 'base-dn',
	    allowBlank: false,
	    emptyText: 'cn=Users,dc=company,dc=net',
	},
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('User Attribute Name'),
	    name: 'user-attr',
	    allowBlank: false,
	    emptyText: 'uid / sAMAccountName',
	},
	{
	    xtype: 'proxmoxcheckbox',
	    fieldLabel: gettext('Anonymous Search'),
	    name: 'anonymous_search',
	    bind: '{anonymous_search}',
	},
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('Bind Domain Name'),
	    name: 'bind-dn',
	    allowBlank: false,
	    emptyText: 'cn=user,dc=company,dc=net',
	    bind: {
		disabled: "{anonymous_search}",
	    },
	},
	{
	    xtype: 'proxmoxtextfield',
	    inputType: 'password',
	    fieldLabel: gettext('Bind Password'),
	    name: 'password',
	    allowBlank: true,
	    cbind: {
		emptyText: get => !get('isCreate') ? gettext('Unchanged') : '',
	    },
	    bind: {
		disabled: "{anonymous_search}",
	    },
	},
    ],

    column2: [
	{
	    xtype: 'proxmoxtextfield',
	    name: 'server1',
	    fieldLabel: gettext('Server'),
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxtextfield',
	    name: 'server2',
	    fieldLabel: gettext('Fallback Server'),
	    submitEmpty: false,
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	},
	{
	    xtype: 'proxmoxintegerfield',
	    name: 'port',
	    fieldLabel: gettext('Port'),
	    minValue: 1,
	    maxValue: 65535,
	    emptyText: gettext('Default'),
	    submitEmptyText: false,
	    deleteEmpty: true,
	},
	{
	    xtype: 'proxmoxKVComboBox',
	    name: 'mode',
	    fieldLabel: gettext('Mode'),
	    editable: false,
	    comboItems: [
		['ldap', 'LDAP'],
		['ldap+starttls', 'STARTTLS'],
		['ldaps', 'LDAPS'],
	    ],
	    bind: "{mode}",
	    cbind: {
		deleteEmpty: '{!isCreate}',
		value: get => get('isCreate') ? 'ldap' : 'LDAP',
	    },
	},
	{
	    xtype: 'proxmoxcheckbox',
	    fieldLabel: gettext('Verify Certificate'),
	    name: 'verify',
	    value: 0,
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },

	    bind: {
		disabled: '{!tls_enabled}',
	    },
	    autoEl: {
		tag: 'div',
		'data-qtip': gettext('Verify TLS certificate of the server'),
	    },

	},
    ],

    columnB: [
	{
	    xtype: 'textfield',
	    name: 'comment',
	    fieldLabel: gettext('Comment'),
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	},
    ],

});


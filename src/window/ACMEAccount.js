Ext.define('Proxmox.window.ACMEAccountCreate', {
    extend: 'Proxmox.window.Edit',
    mixins: ['Proxmox.Mixin.CBind'],
    xtype: 'pmxACMEAccountCreate',

    acmeUrl: undefined,

    width: 450,
    title: gettext('Register Account'),
    isCreate: true,
    method: 'POST',
    submitText: gettext('Register'),
    showTaskViewer: true,
    defaultExists: false,

    items: [
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('Account Name'),
	    name: 'name',
	    cbind: {
		emptyText: (get) => get('defaultExists') ? '' : 'default',
		allowBlank: (get) => !get('defaultExists'),
	    },
	},
	{
	    xtype: 'textfield',
	    name: 'contact',
	    vtype: 'email',
	    allowBlank: false,
	    fieldLabel: gettext('E-Mail'),
	},
	{
	    xtype: 'proxmoxComboGrid',
	    name: 'directory',
	    reference: 'directory',
	    allowBlank: false,
	    valueField: 'url',
	    displayField: 'name',
	    fieldLabel: gettext('ACME Directory'),
	    store: {
		autoLoad: true,
		fields: ['name', 'url'],
		idProperty: ['name'],
		proxy: { type: 'proxmox' },
		sorters: {
		    property: 'name',
		    order: 'ASC',
		},
	    },
	    listConfig: {
		columns: [
		    {
			header: gettext('Name'),
			dataIndex: 'name',
			flex: 1,
		    },
		    {
			header: gettext('URL'),
			dataIndex: 'url',
			flex: 1,
		    },
		],
	    },
	    listeners: {
		change: function(combogrid, value) {
		    let me = this;

		    if (!value) {
			return;
		    }

		    let acmeUrl = me.up('window').acmeUrl;

		    let disp = me.up('window').down('#tos_url_display');
		    let field = me.up('window').down('#tos_url');
		    let checkbox = me.up('window').down('#tos_checkbox');

		    disp.setValue(gettext('Loading'));
		    field.setValue(undefined);
		    checkbox.setValue(undefined);
		    checkbox.setHidden(true);

		    Proxmox.Utils.API2Request({
			url: `${acmeUrl}/tos`,
			method: 'GET',
			params: {
			    directory: value,
			},
			success: function(response, opt) {
			    field.setValue(response.result.data);
			    disp.setValue(response.result.data);
			    checkbox.setHidden(false);
			},
			failure: function(response, opt) {
			    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
			},
		    });
		},
	    },
	},
	{
	    xtype: 'displayfield',
	    itemId: 'tos_url_display',
	    renderer: Proxmox.Utils.render_optional_url,
	    name: 'tos_url_display',
	},
	{
	    xtype: 'hidden',
	    itemId: 'tos_url',
	    name: 'tos_url',
	},
	{
	    xtype: 'proxmoxcheckbox',
	    itemId: 'tos_checkbox',
	    boxLabel: gettext('Accept TOS'),
	    submitValue: false,
	    validateValue: function(value) {
		if (value && this.checked) {
		    return true;
		}
		return false;
	    },
	},
    ],

    initComponent: function() {
	let me = this;

	if (!me.acmeUrl) {
	    throw "no acmeUrl given";
	}

	me.url = `${me.acmeUrl}/account`;

	me.callParent();

	me.lookup('directory')
	    .store
	    .proxy
	    .setUrl(`/api2/json/${me.acmeUrl}/directories`);
    },
});

Ext.define('Proxmox.window.ACMEAccountView', {
    extend: 'Proxmox.window.Edit',
    xtype: 'pmxACMEAccountView',

    width: 600,
    fieldDefaults: {
	labelWidth: 140,
    },

    title: gettext('Account'),

    items: [
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('E-Mail'),
	    name: 'email',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Created'),
	    name: 'createdAt',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Status'),
	    name: 'status',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Directory'),
	    renderer: Proxmox.Utils.render_optional_url,
	    name: 'directory',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Terms of Services'),
	    renderer: Proxmox.Utils.render_optional_url,
	    name: 'tos',
	},
    ],

    initComponent: function() {
	var me = this;

	me.callParent();

	// hide OK/Reset button, because we just want to show data
	me.down('toolbar[dock=bottom]').setVisible(false);

	me.load({
	    success: function(response) {
		var data = response.result.data;
		data.email = data.account.contact[0];
		data.createdAt = data.account.createdAt;
		data.status = data.account.status;
		me.setValues(data);
	    },
	});
    },
});

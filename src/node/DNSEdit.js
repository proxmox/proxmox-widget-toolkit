Ext.define('Proxmox.node.DNSEdit', {
    extend: 'Proxmox.window.Edit',
    alias: ['widget.proxmoxNodeDNSEdit'],

    // pbs needs this set to true
    deleteEmpty: false,

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	me.items = [
	    {
		xtype: 'textfield',
                fieldLabel: gettext('Search domain'),
                name: 'search',
                allowBlank: false,
	    },
	    {
		xtype: 'proxmoxtextfield',
                fieldLabel: gettext('DNS server') + " 1",
		vtype: 'IP64Address',
		skipEmptyText: true,
		deleteEmpty: me.deleteEmpty,
                name: 'dns1',
	    },
	    {
		xtype: 'proxmoxtextfield',
		fieldLabel: gettext('DNS server') + " 2",
		vtype: 'IP64Address',
		skipEmptyText: true,
		deleteEmpty: me.deleteEmpty,
                name: 'dns2',
	    },
	    {
		xtype: 'proxmoxtextfield',
                fieldLabel: gettext('DNS server') + " 3",
		vtype: 'IP64Address',
		skipEmptyText: true,
		deleteEmpty: me.deleteEmpty,
                name: 'dns3',
	    },
	];

	Ext.applyIf(me, {
	    subject: gettext('DNS'),
	    url: "/api2/extjs/nodes/" + me.nodename + "/dns",
	    fieldDefaults: {
		labelWidth: 120,
	    },
	});

	me.callParent();

	me.load();
    },
});

Ext.define('pmx-roles', {
    extend: 'Ext.data.Model',
    fields: ['roleid', 'privs'],
    proxy: {
	type: 'proxmox',
	url: "/api2/json/access/roles",
    },
    idProperty: 'roleid',
});

Ext.define('Proxmox.form.RoleSelector', {
    extend: 'Proxmox.form.ComboGrid',
    alias: 'widget.pmxRoleSelector',

    allowBlank: false,
    autoSelect: false,
    valueField: 'roleid',
    displayField: 'roleid',

    listConfig: {
	columns: [
	    {
		header: gettext('Role'),
		sortable: true,
		dataIndex: 'roleid',
		flex: 1,
	    },
	    {
		header: gettext('Privileges'),
		dataIndex: 'privs',
		flex: 1,
	    },
	],
    },

    store: {
	autoLoad: true,
	model: 'pmx-roles',
	sorters: 'roleid',
    },
});

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
	width: 500,
	columns: [
	    {
		header: gettext('Role'),
		sortable: true,
		dataIndex: 'roleid',
		flex: 2,
	    },
	    {
		header: gettext('Privileges'),
		dataIndex: 'privs',
		cellWrap: true,
		// join manually here, as ExtJS joins without whitespace which breaks cellWrap
		renderer: v => v.join(', '),
		flex: 5,
	    },
	],
    },

    store: {
	autoLoad: true,
	model: 'pmx-roles',
	sorters: 'roleid',
    },
});

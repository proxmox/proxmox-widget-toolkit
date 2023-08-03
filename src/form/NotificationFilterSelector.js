Ext.define('Proxmox.form.NotificationFilterSelector', {
    extend: 'Proxmox.form.ComboGrid',
    alias: ['widget.pmxNotificationFilterSelector'],

    // set default value to empty array, else it inits it with
    // null and after the store load it is an empty array,
    // triggering dirtychange
    value: [],
    valueField: 'name',
    displayField: 'name',
    deleteEmpty: true,
    skipEmptyText: true,
    allowBlank: true,
    editable: false,
    autoSelect: false,

    listConfig: {
	columns: [
	    {
		header: gettext('Filter'),
		dataIndex: 'name',
		sortable: true,
		hideable: false,
		flex: 1,
	    },
	    {
		header: gettext('Comment'),
		dataIndex: 'comment',
		sortable: true,
		hideable: false,
		flex: 2,
	    },
	],
    },

    initComponent: function() {
	let me = this;

	Ext.apply(me, {
	    store: {
		fields: ['name', 'comment'],
		proxy: {
		    type: 'proxmox',
		    url: `/api2/json/${me.baseUrl}/filters`,
		},
		sorters: [
		    {
			property: 'name',
			direction: 'ASC',
		    },
		],
		autoLoad: true,
	    },
	});

	me.callParent();
    },
});

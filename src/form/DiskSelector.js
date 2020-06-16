Ext.define('Proxmox.form.DiskSelector', {
    extend: 'Proxmox.form.ComboGrid',
    xtype: 'pmxDiskSelector',

    // can be
    // undefined: all
    // unused: only unused
    // journal_disk: all disks with gpt
    diskType: undefined,

    // the property the backend wnats for the type ('type' by default)
    typeProperty: 'type',

    valueField: 'devpath',
    displayField: 'devpath',
    emptyText: gettext('No Disks unused'),
    listConfig: {
	width: 600,
	columns: [
	    {
		header: gettext('Device'),
		flex: 3,
		sortable: true,
		dataIndex: 'devpath',
	    },
	    {
		header: gettext('Size'),
		flex: 2,
		sortable: false,
		renderer: Proxmox.Utils.format_size,
		dataIndex: 'size',
	    },
	    {
		header: gettext('Serial'),
		flex: 5,
		sortable: true,
		dataIndex: 'serial',
	    },
	],
    },

    initComponent: function() {
	var me = this;

	var nodename = me.nodename;
	if (!nodename) {
	    throw "no node name specified";
	}

	let extraParams = {};

	if (me.diskType) {
	    extraParams[me.typeProperty] = me.diskType;
	}

	var store = Ext.create('Ext.data.Store', {
	    filterOnLoad: true,
	    model: 'pmx-disk-list',
	    proxy: {
                type: 'proxmox',
                url: `/api2/json/nodes/${nodename}/disks/list`,
		extraParams,
	    },
	    sorters: [
		{
		    property: 'devpath',
		    direction: 'ASC',
		},
	    ],
	});

	Ext.apply(me, {
	    store: store,
	});

        me.callParent();

	store.load();
    },
});

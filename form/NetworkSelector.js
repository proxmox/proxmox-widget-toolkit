Ext.define('Proxmox.form.NetworkSelectorController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.proxmoxNetworkSelectorController',

    init: function(view) {
	var me = this;

	if (!view.nodename) {
	    throw "missing custom view config: nodename";
	}
	view.getStore().getProxy().setUrl('/api2/json/nodes/'+ view.nodename + '/network');
    }
});

Ext.define('Proxmox.data.NetworkSelector', {
    extend: 'Ext.data.Model',
    fields: [
	{name: 'active'},
	{name: 'cidr'},
	{name: 'cidr6'},
	{name: 'comments'},
	{name: 'iface'},
	{name: 'slaves'},
	{name: 'type'}
    ]
});

Ext.define('Proxmox.form.NetworkSelector', {
    extend: 'Proxmox.form.ComboGrid',
    alias: 'widget.proxmoxNetworkSelector',

    nodename: 'localhost',
    controller: 'proxmoxNetworkSelectorController',
    setNodename: function(nodename) {
	this.nodename = nodename;
	var networkSelectorStore = this.getStore();
	networkSelectorStore.removeAll();
	// because of manual local copy of data for ip4/6
	this.getPicker().refresh();
	if (networkSelectorStore && typeof networkSelectorStore.getProxy === 'function') {
	    networkSelectorStore.getProxy().setUrl('/api2/json/nodes/'+ nodename + '/network');
	    networkSelectorStore.load();
	}
    },
    // set default value to empty array, else it inits it with
    // null and after the store load it is an empty array,
    // triggering dirtychange
    value: [],
    valueField: 'cidr',
    displayField: 'cidr',
    store: {
	autoLoad: true,
	model: 'Proxmox.data.NetworkSelector',
	proxy: {
	    type: 'proxmox'
	},
	sorters: [
	    {
		property : 'iface',
		direction: 'ASC'
	    }
	],
	filters: [
	    function(item) {
		return item.data.cidr;
	    }
	],
	listeners: {
	    load: function(store, records, successfull) {

		if (successfull) {
		    records.forEach(function(record) {
			if (record.data.cidr6) {
			    let dest = (record.data.cidr) ? record.copy(null) : record;
			    dest.data.cidr = record.data.cidr6;
			    delete record.data.cidr6;
			    dest.data.comments = record.data.comments6;
			    delete record.data.comments6;
			    store.add(dest);
			}
		    });
		}
	    }
	}
    },
    listConfig: {
	width: 600,
	columns: [
	    {

		header: gettext('CIDR'),
		dataIndex: 'cidr',
		hideable: false,
		flex: 1
	    },
	    {
		header: gettext('Interface'),
		width: 90,
		dataIndex: 'iface'
	    },
	    {
		header: gettext('Active'),
		renderer: Proxmox.Utils.format_boolean,
		width: 60,
		dataIndex: 'active'
	    },
	    {
		header: gettext('Type'),
		width: 80,
		hidden: true,
		dataIndex: 'type'
	    },
	    {
		header: gettext('Comment'),
		flex: 2,
		dataIndex: 'comments'
	    }
	]
    }
});

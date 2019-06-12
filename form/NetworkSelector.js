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

		if(successfull) {
		    records.forEach(function(record) {
			if(record.data.cidr && record.data.cidr6) {
			    var tempcopy = record.copy(null);
			    tempcopy.data.cidr = tempcopy.data.cidr6;
			    delete tempcopy.data.cidr6;
			    tempcopy.data.comment = tempcopy.data.comments6;
			    delete tempcopy.data.comments6;
			    store.add(tempcopy);
			}

			if(!record.data.cidr && record.data.cidr6) {
			    record.data.cidr = record.data.cidr6;
			    delete record.data.cidr6;
			    record.data.comments = record.data.comments6;
			    delete record.data.comments6;
			    store.add(record);
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
		header: gettext('Interface'),
		sortable: true,
		flex:1,
		dataIndex: 'iface'
	    },
	    {
		header: gettext('Active'),
		sortable: true,
		flex:1,
		dataIndex: 'active'
	    },
	    {

		header: gettext('CIDR'),
		dataIndex: 'cidr',
		sortable: true,
		hideable: false,
		flex:1
	    },
	    {
		header: gettext('Type'),
		sortable: true,
		flex:1,
		dataIndex: 'type'
	    },
	    {
		header: gettext('Comment'),
		sortable: true,
		flex:1,
		dataIndex: 'comments'
	    }
	]
    }
});

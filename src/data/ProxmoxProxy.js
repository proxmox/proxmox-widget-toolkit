Ext.define('Proxmox.RestProxy', {
    extend: 'Ext.data.RestProxy',
    alias: 'proxy.proxmox',

    pageParam: null,
    startParam: null,
    limitParam: null,
    groupParam: null,
    sortParam: null,
    filterParam: null,
    noCache: false,

    afterRequest: function(request, success) {
	this.fireEvent('afterload', this, request, success);
    },

    constructor: function(config) {
	Ext.applyIf(config, {
	    reader: {
		type: 'json',
		rootProperty: config.root || 'data',
	    },
	});

	this.callParent([config]);
    },
}, function() {
    Ext.define('KeyValue', {
	extend: "Ext.data.Model",
	fields: ['key', 'value'],
	idProperty: 'key',
    });

    Ext.define('KeyValuePendingDelete', {
	extend: "Ext.data.Model",
	fields: ['key', 'value', 'pending', 'delete'],
	idProperty: 'key',
    });

    Ext.define('proxmox-tasks', {
	extend: 'Ext.data.Model',
	fields: [
	    { name: 'starttime', type: 'date', dateFormat: 'timestamp' },
	    { name: 'endtime', type: 'date', dateFormat: 'timestamp' },
	    { name: 'pid', type: 'int' },
	    {
		name: 'duration',
		sortType: 'asInt',
		calculate: function(data) {
		    let endtime = data.endtime;
		    let starttime = data.starttime;
		    if (endtime !== undefined) {
			return (endtime - starttime)/1000;
		    }
		    return 0;
		},
	    },
	    'node', 'upid', 'user', 'status', 'type', 'id',
	],
	idProperty: 'upid',
    });

    Ext.define('proxmox-cluster-log', {
	extend: 'Ext.data.Model',
	fields: [
	    { name: 'uid', type: 'int' },
	    { name: 'time', type: 'date', dateFormat: 'timestamp' },
	    { name: 'pri', type: 'int' },
	    { name: 'pid', type: 'int' },
	    'node', 'user', 'tag', 'msg',
	    {
		name: 'id',
		convert: function(value, record) {
		    let info = record.data;

		    if (value) {
			return value;
		    }
		    // compute unique ID
		    return info.uid + ':' + info.node;
		},
	    },
	],
	idProperty: 'id',
    });
});

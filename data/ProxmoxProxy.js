Ext.define('Proxmox.RestProxy', {
    extend: 'Ext.data.RestProxy',
    alias : 'proxy.proxmox',
    
    pageParam : null,
    startParam: null,
    limitParam: null,
    groupParam: null,
    sortParam: null,
    filterParam: null,
    noCache : false,

    afterRequest: function(request, success) {
	this.fireEvent('afterload', this, request, success);
	return;
    },

    constructor: function(config) {

	Ext.applyIf(config, {	    
	    reader: {
		type: 'json',
		rootProperty: config.root || 'data'
	    }
	});

	this.callParent([config]); 
    }
});

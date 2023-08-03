Ext.define('Proxmox.window.EndpointEditBase', {
    extend: 'Proxmox.window.Edit',

    isAdd: true,

    fieldDefaults: {
	labelWidth: 120,
    },

    width: 700,

    initComponent: function() {
	let me = this;

	me.isCreate = !me.name;

	if (!me.baseUrl) {
	    throw "baseUrl not set";
	}

	me.url = `/api2/extjs${me.baseUrl}/endpoints/${me.type}`;

	if (me.isCreate) {
	    me.method = 'POST';
	} else {
	    me.url += `/${me.name}`;
	    me.method = 'PUT';
	}

	let endpointConfig = Proxmox.Schema.notificationEndpointTypes[me.type];
	if (!endpointConfig) {
	    throw 'unknown endpoint type';
	}

	me.subject = endpointConfig.name;

	Ext.apply(me, {
	    items: [{
		name: me.name,
		xtype: endpointConfig.ipanel,
		isCreate: me.isCreate,
		type: me.type,
	    }],
	});

	me.callParent();

	if (!me.isCreate) {
	    me.load();
	}
    },
});

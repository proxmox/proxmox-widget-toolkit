Ext.define('Proxmox.window.AuthEditBase', {
    extend: 'Proxmox.window.Edit',

    isAdd: true,

    fieldDefaults: {
	labelWidth: 120,
    },

    baseurl: '/access/domains',
    useTypeInUrl: false,

    initComponent: function() {
	var me = this;

	me.isCreate = !me.realm;

	me.url = `/api2/extjs${me.baseUrl}`;
	if (me.useTypeInUrl) {
	    me.url += `/${me.authType}`;
	}

	if (me.isCreate) {
	    me.method = 'POST';
	} else {
	    me.url += `/${me.realm}`;
	    me.method = 'PUT';
	}

	let authConfig = Proxmox.Schema.authDomains[me.authType];
	if (!authConfig) {
	    throw 'unknown auth type';
	} else if (!authConfig.add && me.isCreate) {
	    throw 'trying to add non addable realm';
	}

	me.subject = authConfig.name;

	let items;
	let bodyPadding;
	if (authConfig.syncipanel) {
	    bodyPadding = 0;
	    items = {
		xtype: 'tabpanel',
		region: 'center',
		layout: 'fit',
		bodyPadding: 10,
		items: [
		    {
			title: gettext('General'),
			realm: me.realm,
			xtype: authConfig.ipanel,
			isCreate: me.isCreate,
			useTypeInUrl: me.useTypeInUrl,
			type: me.authType,
		    },
		    {
			title: gettext('Sync Options'),
			realm: me.realm,
			xtype: authConfig.syncipanel,
			isCreate: me.isCreate,
			type: me.authType,
		    },
		],
	    };
	} else {
	    items = [{
		realm: me.realm,
		xtype: authConfig.ipanel,
		isCreate: me.isCreate,
		useTypeInUrl: me.useTypeInUrl,
		type: me.authType,
	    }];
	}

	Ext.apply(me, {
	    items,
	    bodyPadding,
	});

	me.callParent();

	if (!me.isCreate) {
	    me.load({
		success: function(response, options) {
		    var data = response.result.data || {};
		    // just to be sure (should not happen)
		    // only check this when the type is not in the api path
		    if (!me.useTypeInUrl && data.type !== me.authType) {
			me.close();
			throw "got wrong auth type";
		    }
		    me.setValues(data);
		},
	    });
	}
    },
});

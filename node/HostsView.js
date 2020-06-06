Ext.define('Proxmox.node.HostsView', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeHostsView',

    reload: function() {
	let me = this;
	me.store.load();
    },

    tbar: [
	{
	    text: gettext('Save'),
	    disabled: true,
	    itemId: 'savebtn',
	    handler: function() {
		let view = this.up('panel');
		Proxmox.Utils.API2Request({
		    params: {
			digest: view.digest,
			data: view.down('#hostsfield').getValue(),
		    },
		    method: 'POST',
		    url: '/nodes/' + view.nodename + '/hosts',
		    waitMsgTarget: view,
		    success: function(response, opts) {
			view.reload();
		    },
		    failure: function(response, opts) {
			Ext.Msg.alert('Error', response.htmlStatus);
		    },
		});
	    },
	},
	{
	    text: gettext('Revert'),
	    disabled: true,
	    itemId: 'resetbtn',
	    handler: function() {
		let view = this.up('panel');
		view.down('#hostsfield').reset();
	    },
	},
    ],

	    layout: 'fit',

    items: [
	{
	    xtype: 'textarea',
	    itemId: 'hostsfield',
	    fieldStyle: {
		'font-family': 'monospace',
		'white-space': 'pre',
	    },
	    listeners: {
		dirtychange: function(ta, dirty) {
		    let view = this.up('panel');
		    view.down('#savebtn').setDisabled(!dirty);
		    view.down('#resetbtn').setDisabled(!dirty);
		},
	    },
	},
    ],

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	me.store = Ext.create('Ext.data.Store', {
	    proxy: {
		type: 'proxmox',
		url: "/api2/json/nodes/" + me.nodename + "/hosts",
	    },
	});

	me.callParent();

	Proxmox.Utils.monStoreErrors(me, me.store);

	me.mon(me.store, 'load', function(store, records, success) {
	    if (!success || records.length < 1) {
		return;
	    }
	    me.digest = records[0].data.digest;
	    let data = records[0].data.data;
	    me.down('#hostsfield').setValue(data);
	    me.down('#hostsfield').resetOriginalValue();
	});

	me.reload();
    },
});

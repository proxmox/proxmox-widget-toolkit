Ext.define('Proxmox.node.HostsView', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeHostsView',

    reload: function() {
	var me = this;
	me.store.load();
    },

    tbar: [
	{
	    text: gettext('Save'),
	    disabled: true,
	    itemId: 'savebtn',
	    handler: function() {
		var me = this.up('panel');
		Proxmox.Utils.API2Request({
		    params: {
			digest: me.digest,
			data: me.down('#hostsfield').getValue(),
		    },
		    method: 'POST',
		    url: '/nodes/' + me.nodename + '/hosts',
		    waitMsgTarget: me,
		    success: function(response, opts) {
			me.reload();
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
		var me = this.up('panel');
		me.down('#hostsfield').reset();
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
		    var me = this.up('panel');
		    me.down('#savebtn').setDisabled(!dirty);
		    me.down('#resetbtn').setDisabled(!dirty);
		},
	    },
	},
    ],

    initComponent: function() {
	var me = this;

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
	    var data = records[0].data.data;
	    me.down('#hostsfield').setValue(data);
	    me.down('#hostsfield').resetOriginalValue();
	});

	me.reload();
    },
});

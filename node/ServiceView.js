Ext.define('proxmox-services', {
    extend: 'Ext.data.Model',
    fields: [ 'service', 'name', 'desc', 'state' ],
    idProperty: 'service'
});

Ext.define('Proxmox.node.ServiceView', {
    extend: 'Ext.grid.GridPanel',

    alias: ['widget.proxmoxNodeServiceView'],

    startOnlyServices: {},

    initComponent : function() {
	var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	var rstore = Ext.create('Proxmox.data.UpdateStore', {
	    interval: 1000,
	    storeid: 'proxmox-services' + me.nodename,
	    model: 'proxmox-services',
	    proxy: {
                type: 'proxmox',
                url: "/api2/json/nodes/" + me.nodename + "/services"
	    }
	});

	var store = Ext.create('Proxmox.data.DiffStore', {
	    rstore: rstore,
	    sortAfterUpdate: true,
	    sorters: [
		{
		    property : 'name',
		    direction: 'ASC'
		}
	    ]
	});

	var service_cmd = function(cmd) {
	    var sm = me.getSelectionModel();
	    var rec = sm.getSelection()[0];
	    Proxmox.Utils.API2Request({
		url: "/nodes/" + me.nodename + "/services/" + rec.data.service + "/" + cmd,
		method: 'POST',
		failure: function(response, opts) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    me.loading = true;
		},
		success: function(response, opts) {
		    rstore.startUpdate();
		    var upid = response.result.data;

		    var win = Ext.create('Proxmox.window.TaskProgress', {
			upid: upid
		    });
		    win.show();
		}
	    });
	};

	var start_btn = new Ext.Button({
	    text: gettext('Start'),
	    disabled: true,
	    handler: function(){
		service_cmd("start");
	    }
	});

	var stop_btn = new Ext.Button({
	    text: gettext('Stop'),
	    disabled: true,
	    handler: function(){
		service_cmd("stop");
	    }
	});

	var restart_btn = new Ext.Button({
	    text: gettext('Restart'),
	    disabled: true,
	    handler: function(){
		service_cmd("restart");
	    }
	});

	var set_button_status = function() {
	    var sm = me.getSelectionModel();
	    var rec = sm.getSelection()[0];

	    if (!rec) {
		start_btn.disable();
		stop_btn.disable();
		restart_btn.disable();
		return;
	    }
	    var service = rec.data.service;
	    var state = rec.data.state;

	    if (me.startOnlyServices[service]) {
		if (state == 'running') {
		    start_btn.disable();
		    restart_btn.enable();
		} else {
		    start_btn.enable();
		    restart_btn.disable();
		}
		stop_btn.disable();
	    } else {
		if (state == 'running') {
		    start_btn.disable();
		    restart_btn.enable();
		    stop_btn.enable();
		} else {
		    start_btn.enable();
		    restart_btn.disable();
		    stop_btn.disable();
		}
	    }
	};

	me.mon(store, 'refresh', set_button_status);

	Proxmox.Utils.monStoreErrors(me, rstore);

	Ext.apply(me, {
	    store: store,
	    stateful: false,
	    tbar: [ start_btn, stop_btn, restart_btn ],
	    columns: [
		{
		    header: gettext('Name'),
		    width: 100,
		    sortable: true,
		    dataIndex: 'name'
		},
		{
		    header: gettext('Status'),
		    width: 100,
		    sortable: true,
		    dataIndex: 'state'
		},
		{
		    header: gettext('Description'),
		    renderer: Ext.String.htmlEncode,
		    dataIndex: 'desc',
		    flex: 1
		}
	    ],
	    listeners: {
		selectionchange: set_button_status,
		activate: rstore.startUpdate,
		destroy: rstore.stopUpdate
	    }
	});

	me.callParent();
    }
});

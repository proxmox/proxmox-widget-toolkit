Ext.define('Proxmox.window.ZFSDetail', {
    extend: 'Ext.window.Window',
    alias: 'widget.pmxZFSDetail',
    mixins: ['Proxmox.Mixin.CBind'],

    cbindData: function(initialConfig) {
	let me = this;
	me.url = `/nodes/${me.nodename}/disks/zfs/${encodeURIComponent(me.zpool)}`;
	return {
	    zpoolUri: `/api2/json/${me.url}`,
	    title: `${gettext('Status')}: ${me.zpool}`,
	};
    },

    controller: {
	xclass: 'Ext.app.ViewController',

	reload: function() {
	    let me = this;
	    let view = me.getView();
	    me.lookup('status').reload();

	    Proxmox.Utils.API2Request({
		url: `/api2/extjs/${view.url}`,
		waitMsgTarget: view,
		method: 'GET',
		failure: function(response, opts) {
		    Proxmox.Utils.setErrorMask(view, response.htmlStatus);
		},
		success: function(response, opts) {
		    let devices = me.lookup('devices');
		    devices.getSelectionModel().deselectAll();
		    devices.setRootNode(response.result.data);
		    devices.expandAll();
		},
	    });
	},

	init: function(view) {
	    let me = this;
	    Proxmox.Utils.monStoreErrors(me, me.lookup('status').getStore().rstore);
	    me.reload();
	},
    },

    modal: true,
    width: 800,
    height: 600,
    resizable: true,
    cbind: {
	title: '{title}',
    },

    layout: {
	type: 'vbox',
	align: 'stretch',
    },
    defaults: {
	layout: 'fit',
	border: false,
    },

    tbar: [
	{
	    text: gettext('Reload'),
	    iconCls: 'fa fa-refresh',
	    handler: 'reload',
	},
    ],

    items: [
	{
	    xtype: 'proxmoxObjectGrid',
	    reference: 'status',
	    flex: 0,
	    cbind: {
		url: '{zpoolUri}',
		nodename: '{nodename}',
	    },
	    rows: {
		scan: {
		    header: gettext('Scan'),
		},
		status: {
		    header: gettext('Status'),
		},
		action: {
		    header: gettext('Action'),
		},
		errors: {
		    header: gettext('Errors'),
		},
	    },
	},
	{
	    xtype: 'treepanel',
	    reference: 'devices',
	    title: gettext('Devices'),
	    stateful: true,
	    stateId: 'grid-node-zfsstatus',
	    rootVisible: true,
	    fields: ['name', 'status',
		{
		    type: 'string',
		    name: 'iconCls',
		    calculate: function(data) {
			var txt = 'fa x-fa-tree fa-';
			if (data.leaf) {
			    return txt + 'hdd-o';
			}
			return undefined;
		    },
		},
	    ],
	    sorters: 'name',
	    flex: 1,
	    cbind: {
		zpool: '{zpoolUri}',
		nodename: '{nodename}',
	    },
	    columns: [
		{
		    xtype: 'treecolumn',
		    text: gettext('Name'),
		    dataIndex: 'name',
		    flex: 1,
		},
		{
		    text: gettext('Health'),
		    renderer: Proxmox.Utils.render_zfs_health,
		    dataIndex: 'state',
		},
		{
		    text: 'READ',
		    dataIndex: 'read',
		},
		{
		    text: 'WRITE',
		    dataIndex: 'write',
		},
		{
		    text: 'CKSUM',
		    dataIndex: 'cksum',
		},
		{
		    text: gettext('Message'),
		    dataIndex: 'msg',
		},
	    ],
	},
    ],
});

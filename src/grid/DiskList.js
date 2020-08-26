Ext.define('pmx-disk-list', {
    extend: 'Ext.data.Model',
    fields: [
	'devpath', 'used',
	{ name: 'size', type: 'number' },
	{ name: 'osdid', type: 'number' },
	{
	    name: 'status',
	    convert: function(value, rec) {
		if (value) return value;
		if (rec.data.health) {
		    return rec.data.health;
		}
		return Proxmox.Utils.unknownText;
	    },
	},
	{
	    name: 'name',
	    convert: function(value, rec) {
		if (value) return value;
		if (rec.data.devpath) return rec.data.devpath;
		return undefined;
	    },
	},
	{
	    name: 'disk-type',
	    convert: function(value, rec) {
		if (value) return value;
		if (rec.data.type) return rec.data.type;
		return undefined;
	    },
	},
	'vendor', 'model', 'serial', 'rpm', 'type', 'wearout', 'health',
    ],
    idProperty: 'devpath',
});

Ext.define('Proxmox.DiskList', {
    extend: 'Ext.grid.GridPanel',
    alias: 'widget.pmxDiskList',

    emptyText: gettext('No Disks found'),

    stateful: true,
    stateId: 'grid-node-disks',

    controller: {
	xclass: 'Ext.app.ViewController',

	reload: function() {
	    let me = this;
	    me.getView().getStore().load();
	},

	openSmartWindow: function() {
	    let me = this;
	    let view = me.getView();
	    let selection = view.getSelection();
	    if (!selection || selection.length < 1) return;

	    let rec = selection[0];
	    Ext.create('Proxmox.window.DiskSmart', {
		baseurl: view.baseurl,
		dev: rec.data.name,
	    }).show();
	},

	initGPT: function() {
	    let me = this;
	    let view = me.getView();
	    let selection = view.getSelection();
	    if (!selection || selection.length < 1) return;

	    let rec = selection[0];
	    Proxmox.Utils.API2Request({
		url: `${view.exturl}/initgpt`,
		waitMsgTarget: view,
		method: 'POST',
		params: { disk: rec.data.name },
		failure: function(response, options) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		},
		success: function(response, options) {
		    var upid = response.result.data;
		    var win = Ext.create('Proxmox.window.TaskProgress', {
		        upid: upid,
			taskDone: function() {
			    me.reload();
			},
		    });
		    win.show();
		},
	    });
	},

	init: function(view) {
	    Proxmox.Utils.monStoreErrors(view, view.getStore(), true);

	    let nodename = view.nodename || 'localhost';
	    view.baseurl = `/api2/json/nodes/${nodename}/disks`;
	    view.exturl = `/api2/extjs/nodes/${nodename}/disks`;
	    view.getStore().getProxy().setUrl(`${view.baseurl}/list`);
	    view.getStore().load();
	},
    },

    store: {
	model: 'pmx-disk-list',
	proxy: {
	    type: 'proxmox',
	},
	sorters: [
	    {
		property: 'dev',
		direction: 'ASC',
	    },
	],
    },

    tbar: [
	{
	    text: gettext('Reload'),
	    handler: 'reload',
	},
	{
	    xtype: 'proxmoxButton',
	    text: gettext('Show S.M.A.R.T. values'),
	    disabled: true,
	    handler: 'openSmartWindow',
	},
	{
	    xtype: 'proxmoxButton',
	    text: gettext('Initialize Disk with GPT'),
	    disabled: true,
	    enableFn: function(rec) {
		if (!rec || (rec.data.used && rec.data.used !== 'unused')) {
		    return false;
		} else {
		    return true;
		}
	    },
	    handler: 'initGPT',
	},
    ],

    columns: [
	{
	    header: gettext('Device'),
	    width: 150,
	    sortable: true,
	    dataIndex: 'devpath',
	},
	{
	    header: gettext('Type'),
	    width: 80,
	    sortable: true,
	    dataIndex: 'disk-type',
	    renderer: function(v) {
		if (v === undefined) return Proxmox.Utils.unknownText;
		switch (v) {
		    case 'ssd': return 'SSD';
		    case 'hdd': return 'Hard Disk';
		    case 'usb': return 'USB';
		    default: return v;
		}
	    },
	},
	{
	    header: gettext('Usage'),
	    width: 150,
	    sortable: false,
	    renderer: v => v || Proxmox.Utils.noText,
	    dataIndex: 'used',
	},
	{
	    header: gettext('Size'),
	    width: 100,
	    align: 'right',
	    sortable: true,
	    renderer: Proxmox.Utils.format_size,
	    dataIndex: 'size',
	},
	{
	    header: 'GPT',
	    width: 60,
	    align: 'right',
	    renderer: Proxmox.Utils.format_boolean,
	    dataIndex: 'gpt',
	},
	{
	    header: gettext('Vendor'),
	    width: 100,
	    sortable: true,
	    hidden: true,
	    renderer: Ext.String.htmlEncode,
	    dataIndex: 'vendor',
	},
	{
	    header: gettext('Model'),
	    width: 200,
	    sortable: true,
	    renderer: Ext.String.htmlEncode,
	    dataIndex: 'model',
	},
	{
	    header: gettext('Serial'),
	    width: 200,
	    sortable: true,
	    renderer: Ext.String.htmlEncode,
	    dataIndex: 'serial',
	},
	{
	    header: 'S.M.A.R.T.',
	    width: 100,
	    sortable: true,
	    renderer: Ext.String.htmlEncode,
	    dataIndex: 'status',
	},
	{
	    header: 'Wearout',
	    width: 90,
	    sortable: true,
	    align: 'right',
	    dataIndex: 'wearout',
	    renderer: function(value) {
		if (Ext.isNumeric(value)) {
		    return (100 - value).toString() + '%';
		}
		return 'N/A';
	    },
	},
    ],

    listeners: {
	itemdblclick: 'openSmartWindow',
    },
});

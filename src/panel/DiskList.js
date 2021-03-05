Ext.define('pmx-disk-list', {
    extend: 'Ext.data.Model',
    fields: [
	'devpath', 'used',
	{ name: 'size', type: 'number' },
	{ name: 'osdid', type: 'number', defaultValue: -1 },
	{
	    name: 'status',
	    convert: function(value, rec) {
		if (value) return value;
		if (rec.data.health) {
		    return rec.data.health;
		}

		if (rec.data.type === 'partition') {
		    return "";
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
    extend: 'Ext.tree.Panel',
    alias: 'widget.pmxDiskList',

    rootVisible: false,

    emptyText: gettext('No Disks found'),

    stateful: true,
    stateId: 'tree-node-disks',

    controller: {
	xclass: 'Ext.app.ViewController',

	reload: function() {
	    let me = this;
	    let view = me.getView();

	    let extraParams = {};
	    if (view.includePartitions) {
		extraParams['include-partitions'] = 1;
	    }

	    let url = `${view.baseurl}/list`;
	    me.store.setProxy({
		type: 'proxmox',
		extraParams: extraParams,
		url: url,
	    });
	    me.store.load();
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
	    let nodename = view.nodename || 'localhost';
	    view.baseurl = `/api2/json/nodes/${nodename}/disks`;
	    view.exturl = `/api2/extjs/nodes/${nodename}/disks`;

	    this.store = Ext.create('Ext.data.Store', {
		model: 'pmx-disk-list',
	    });
	    this.store.on('load', this.onLoad, this);

	    Proxmox.Utils.monStoreErrors(view, this.store);
	    this.reload();
	},

	onLoad: function(store, records, success, operation) {
	    let me = this;
	    let view = this.getView();

	    if (!success) {
		Proxmox.Utils.setErrorMask(
		    view,
		    Proxmox.Utils.getResponseErrorMessage(operation.getError()),
		);
		return;
	    }

	    let disks = {};

	    for (const item of records) {
		let data = item.data;
		data.leaf = true;
		data.expanded = true;
		data.children = [];
		data.iconCls = 'fa fa-fw fa-hdd-o x-fa-tree';
		if (!data.parent) {
		    disks[data.devpath] = data;
		}
	    }
	    for (const item of records) {
		let data = item.data;
		if (data.parent) {
		    disks[data.parent].leaf = false;
		    disks[data.parent].children.push(data);
		}
	    }

	    let children = [];
	    for (const [_, device] of Object.entries(disks)) {
		children.push(device);
	    }

	    view.setRootNode({
		expanded: true,
		children: children,
	    });

	    Proxmox.Utils.setErrorMask(view, false);
	},
    },

    tbar: [
	{
	    text: gettext('Reload'),
	    handler: 'reload',
	},
	{
	    xtype: 'proxmoxButton',
	    text: gettext('Show S.M.A.R.T. values'),
	    parentXType: 'treepanel',
	    disabled: true,
	    enableFn: function(rec) {
		if (!rec || rec.data.parent) {
		    return false;
		} else {
		    return true;
		}
	    },
	    handler: 'openSmartWindow',
	},
	{
	    xtype: 'proxmoxButton',
	    text: gettext('Initialize Disk with GPT'),
	    parentXType: 'treepanel',
	    disabled: true,
	    enableFn: function(rec) {
		if (!rec || rec.data.parent ||
		    (rec.data.used && rec.data.used !== 'unused')) {
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
	    xtype: 'treecolumn',
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
	    renderer: function(v, metaData, rec) {
		let extendedInfo = ' ';
		if (rec) {
		    let types = [];
		    if (rec.data.osdid !== undefined && rec.data.osdid >= 0) {
			types.push(`OSD.${rec.data.osdid.toString()}`);
		    }
		    if (rec.data.journals > 0) {
			types.push('Journal');
		    }
		    if (rec.data.db > 0) {
			types.push('DB');
		    }
		    if (rec.data.wal > 0) {
			types.push('WAL');
		    }
		    if (types.length > 0) {
			extendedInfo = `, Ceph (${types.join(', ')})`;
		    }
		}
		return v ? `${v}${extendedInfo}` : Proxmox.Utils.noText;
	    },
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

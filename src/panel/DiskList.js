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
	'vendor', 'model', 'serial', 'rpm', 'type', 'wearout', 'health', 'mounted',
    ],
    idProperty: 'devpath',
});

Ext.define('Proxmox.DiskList', {
    extend: 'Ext.tree.Panel',
    alias: 'widget.pmxDiskList',

    supportsWipeDisk: false,

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
		failure: response => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
		success: function(response, options) {
		    Ext.create('Proxmox.window.TaskProgress', {
		        upid: response.result.data,
			taskDone: function() {
			    me.reload();
			},
			autoShow: true,
		    });
		},
	    });
	},

	wipeDisk: function() {
	    let me = this;
	    let view = me.getView();
	    let selection = view.getSelection();
	    if (!selection || selection.length < 1) return;

	    let rec = selection[0];
	    Proxmox.Utils.API2Request({
		url: `${view.exturl}/wipedisk`,
		waitMsgTarget: view,
		method: 'PUT',
		params: { disk: rec.data.name },
		failure: response => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
		success: function(response, options) {
		    Ext.create('Proxmox.window.TaskProgress', {
		        upid: response.result.data,
			taskDone: function() {
			    me.reload();
			},
			autoShow: true,
		    });
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
		data.expanded = true;
		data.children = data.partitions ?? [];
		for (let p of data.children) {
		    p['disk-type'] = 'partition';
		    p.iconCls = 'fa fa-fw fa-hdd-o x-fa-tree';
		    p.used = p.used === 'filesystem' ? p.filesystem : p.used;
		    p.parent = data.devpath;
		    p.children = [];
		    p.leaf = true;
		}
		data.iconCls = 'fa fa-fw fa-hdd-o x-fa-tree';
		data.leaf = data.children.length === 0;

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

    renderDiskType: function(v) {
	if (v === undefined) return Proxmox.Utils.unknownText;
	switch (v) {
	    case 'ssd': return 'SSD';
	    case 'hdd': return 'Hard Disk';
	    case 'usb': return 'USB';
	    default: return v;
	}
    },

    renderDiskUsage: function(v, metaData, rec) {
	let extendedInfo = '';
	if (rec) {
	    let types = [];
	    if (rec.data['osdid-list'] && rec.data['osdid-list'].length > 0) {
		for (const id of rec.data['osdid-list'].sort()) {
		    types.push(`OSD.${id.toString()}`);
		}
	    } else if (rec.data.osdid !== undefined && rec.data.osdid >= 0) {
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
	const formatMap = {
	    'bios': 'BIOS boot',
	    'zfsreserved': 'ZFS reserved',
	    'efi': 'EFI',
	    'lvm': 'LVM',
	    'zfs': 'ZFS',
	};

	v = formatMap[v] || v;
	return v ? `${v}${extendedInfo}` : Proxmox.Utils.noText;
    },

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
		let me = this;
		return me.renderDiskType(v);
	    },
	},
	{
	    header: gettext('Usage'),
	    width: 150,
	    sortable: false,
	    renderer: function(v, metaData, rec) {
		let me = this;
		return me.renderDiskUsage(v, metaData, rec);
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
	    header: 'Mounted',
	    width: 60,
	    align: 'right',
	    renderer: Proxmox.Utils.format_boolean,
	    dataIndex: 'mounted',
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

    initComponent: function() {
	let me = this;

	let tbar = [
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
	];

	if (me.supportsWipeDisk) {
	    tbar.push('-');
	    tbar.push({
		xtype: 'proxmoxButton',
		text: gettext('Wipe Disk'),
		parentXType: 'treepanel',
		dangerous: true,
		confirmMsg: function(rec) {
		    const data = rec.data;

		    let mainMessage = Ext.String.format(
			gettext('Are you sure you want to wipe {0}?'),
			data.devpath,
		    );
		    mainMessage += `<br> ${gettext('All data on the device will be lost!')}`;

		    const type = me.renderDiskType(data["disk-type"]);

		    let usage;
		    if (data.children.length > 0) {
			const partitionUsage = data.children.map(
			    partition => me.renderDiskUsage(partition.used),
			).join(', ');
			usage = `${gettext('Partitions')} (${partitionUsage})`;
		    } else {
			usage = me.renderDiskUsage(data.used, undefined, rec);
		    }

		    const size = Proxmox.Utils.format_size(data.size);
		    const serial = Ext.String.htmlEncode(data.serial);

		    let additionalInfo = `${gettext('Type')}: ${type}<br>`;
		    additionalInfo += `${gettext('Usage')}: ${usage}<br>`;
		    additionalInfo += `${gettext('Size')}: ${size}<br>`;
		    additionalInfo += `${gettext('Serial')}: ${serial}`;

		    return `${mainMessage}<br><br>${additionalInfo}`;
		},
		disabled: true,
		handler: 'wipeDisk',
	    });
	}

	me.tbar = tbar;

	me.callParent();
    },
});

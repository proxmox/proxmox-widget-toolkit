Ext.define('proxmox-networks', {
    extend: 'Ext.data.Model',
    fields: [
	'active',
	'address',
	'address6',
	'autostart',
	'bridge_ports',
	'cidr',
	'cidr6',
	'comments',
	'gateway',
	'gateway6',
	'iface',
	'netmask',
	'netmask6',
	'slaves',
	'type',
	'vlan-id',
	'vlan-raw-device',
    ],
    idProperty: 'iface',
});

Ext.define('Proxmox.node.NetworkView', {
    extend: 'Ext.panel.Panel',

    alias: ['widget.proxmoxNodeNetworkView'],

    // defines what types of network devices we want to create
    // order is always the same
    types: ['bridge', 'bond', 'vlan', 'ovs'],

    showApplyBtn: false,

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	let baseUrl = `/nodes/${me.nodename}/network`;

	let store = Ext.create('Ext.data.Store', {
	    model: 'proxmox-networks',
	    proxy: {
                type: 'proxmox',
                url: '/api2/json' + baseUrl,
	    },
	    sorters: [
		{
		    property: 'iface',
		    direction: 'ASC',
		},
	    ],
	});

	let reload = function() {
	    let changeitem = me.down('#changes');
	    let apply_btn = me.down('#apply');
	    let revert_btn = me.down('#revert');
	    Proxmox.Utils.API2Request({
		url: baseUrl,
		failure: function(response, opts) {
		    store.loadData({});
		    Proxmox.Utils.setErrorMask(me, response.htmlStatus);
		    changeitem.update('');
		    changeitem.setHidden(true);
		},
		success: function(response, opts) {
		    let result = Ext.decode(response.responseText);
		    store.loadData(result.data);
		    let changes = result.changes;
		    if (changes === undefined || changes === '') {
			changes = gettext("No changes");
			changeitem.setHidden(true);
			apply_btn.setDisabled(true);
			revert_btn.setDisabled(true);
		    } else {
			changeitem.update("<pre>" + Ext.htmlEncode(changes) + "</pre>");
			changeitem.setHidden(false);
			apply_btn.setDisabled(false);
			revert_btn.setDisabled(false);
		    }
		},
	    });
	};

	let run_editor = function() {
	    let grid = me.down('gridpanel');
	    let sm = grid.getSelectionModel();
	    let rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }

	    Ext.create('Proxmox.node.NetworkEdit', {
		autoShow: true,
		nodename: me.nodename,
		iface: rec.data.iface,
		iftype: rec.data.type,
		listeners: {
		    destroy: () => reload(),
		},
	    });
	};

	let edit_btn = new Ext.Button({
	    text: gettext('Edit'),
	    disabled: true,
	    handler: run_editor,
	});

	let sm = Ext.create('Ext.selection.RowModel', {});

	let del_btn = new Proxmox.button.StdRemoveButton({
	    selModel: sm,
	    getUrl: ({ data }) => `${baseUrl}/${data.iface}`,
	    callback: () => reload(),
	});

	let apply_btn = Ext.create('Proxmox.button.Button', {
	    text: gettext('Apply Configuration'),
	    itemId: 'apply',
	    disabled: true,
	    confirmMsg: 'Do you want to apply pending network changes?',
	    hidden: !me.showApplyBtn,
	    handler: function() {
		Proxmox.Utils.API2Request({
		    url: baseUrl,
		    method: 'PUT',
		    waitMsgTarget: me,
		    success: function({ result }, opts) {
			Ext.create('Proxmox.window.TaskProgress', {
			    autoShow: true,
			    taskDone: reload,
			    upid: result.data,
			});
		    },
		    failure: response => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
		});
	    },
	});

	let set_button_status = function() {
	    let rec = sm.getSelection()[0];

	    edit_btn.setDisabled(!rec);
	    del_btn.setDisabled(!rec);
	};

	let findNextFreeInterfaceId = function(prefix) {
	    for (let next = 0; next <= 9999; next++) {
		let id = `${prefix}${next.toString()}`;
		if (!store.getById(id)) {
		    return id;
		}
	    }
	    Ext.Msg.alert('Error', `No free ID for ${prefix} found!`);
	    return '';
	};

	let menu_items = [];
	let addEditWindowToMenu = (iType, iDefault) => {
	    menu_items.push({
		text: Proxmox.Utils.render_network_iface_type(iType),
		handler: () => Ext.create('Proxmox.node.NetworkEdit', {
		    autoShow: true,
		    nodename: me.nodename,
		    iftype: iType,
		    iface_default: findNextFreeInterfaceId(iDefault ?? iType),
		    onlineHelp: 'sysadmin_network_configuration',
		    listeners: {
			destroy: () => reload(),
		    },
		}),
	    });
	};

	if (me.types.indexOf('bridge') !== -1) {
	    addEditWindowToMenu('bridge', 'vmbr');
	}

	if (me.types.indexOf('bond') !== -1) {
	    addEditWindowToMenu('bond');
	}

	if (me.types.indexOf('vlan') !== -1) {
	    addEditWindowToMenu('vlan');
	}

	if (me.types.indexOf('ovs') !== -1) {
	    if (menu_items.length > 0) {
		menu_items.push({ xtype: 'menuseparator' });
	    }

	    addEditWindowToMenu('OVSBridge', 'vmbr');
	    addEditWindowToMenu('OVSBond', 'bond');

	    menu_items.push({
		text: Proxmox.Utils.render_network_iface_type('OVSIntPort'),
		handler: () => Ext.create('Proxmox.node.NetworkEdit', {
		    autoShow: true,
		    nodename: me.nodename,
		    iftype: 'OVSIntPort',
		    listeners: {
			destroy: () => reload(),
		    },
		}),
	    });
	}

	let renderer_generator = function(fieldname) {
	    return function(val, metaData, rec) {
		let tmp = [];
		if (rec.data[fieldname]) {
		    tmp.push(rec.data[fieldname]);
		}
		if (rec.data[fieldname + '6']) {
		    tmp.push(rec.data[fieldname + '6']);
		}
		return tmp.join('<br>') || '';
	    };
	};

	Ext.apply(me, {
	    layout: 'border',
	    tbar: [
		{
		    text: gettext('Create'),
		    menu: {
			plain: true,
			items: menu_items,
		    },
		}, '-',
		{
		    text: gettext('Revert'),
		    itemId: 'revert',
		    handler: function() {
			Proxmox.Utils.API2Request({
			    url: baseUrl,
			    method: 'DELETE',
			    waitMsgTarget: me,
			    callback: function() {
				reload();
			    },
			    failure: response => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
			});
		    },
		},
		edit_btn,
		del_btn,
		'-',
		apply_btn,
	    ],
	    items: [
		{
		    xtype: 'gridpanel',
		    stateful: true,
		    stateId: 'grid-node-network',
		    store: store,
		    selModel: sm,
		    region: 'center',
		    border: false,
		    columns: [
			{
			    header: gettext('Name'),
			    sortable: true,
			    dataIndex: 'iface',
			},
			{
			    header: gettext('Type'),
			    sortable: true,
			    width: 120,
			    renderer: Proxmox.Utils.render_network_iface_type,
			    dataIndex: 'type',
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('Active'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'active',
			    trueText: Proxmox.Utils.yesText,
			    falseText: Proxmox.Utils.noText,
			    undefinedText: Proxmox.Utils.noText,
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('Autostart'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'autostart',
			    trueText: Proxmox.Utils.yesText,
			    falseText: Proxmox.Utils.noText,
			    undefinedText: Proxmox.Utils.noText,
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('VLAN aware'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'bridge_vlan_aware',
			    trueText: Proxmox.Utils.yesText,
			    falseText: Proxmox.Utils.noText,
			    undefinedText: Proxmox.Utils.noText,
			},
			{
			    header: gettext('Ports/Slaves'),
			    dataIndex: 'type',
			    renderer: (value, metaData, { data }) => {
				if (value === 'bridge') {
				    return data.bridge_ports;
				} else if (value === 'bond') {
				    return data.slaves;
				} else if (value === 'OVSBridge') {
				    return data.ovs_ports;
				} else if (value === 'OVSBond') {
				    return data.ovs_bonds;
				}
				return '';
			    },
			},
			{
			    header: gettext('Bond Mode'),
			    dataIndex: 'bond_mode',
			    renderer: Proxmox.Utils.render_bond_mode,
			},
			{
			    header: gettext('Hash Policy'),
			    hidden: true,
			    dataIndex: 'bond_xmit_hash_policy',
			},
			{
			    header: gettext('IP address'),
			    sortable: true,
			    width: 120,
			    hidden: true,
			    dataIndex: 'address',
			    renderer: renderer_generator('address'),
			},
			{
			    header: gettext('Subnet mask'),
			    width: 120,
			    sortable: true,
			    hidden: true,
			    dataIndex: 'netmask',
			    renderer: renderer_generator('netmask'),
			},
			{
			    header: gettext('CIDR'),
			    width: 150,
			    sortable: true,
			    dataIndex: 'cidr',
			    renderer: renderer_generator('cidr'),
			},
			{
			    header: gettext('Gateway'),
			    width: 150,
			    sortable: true,
			    dataIndex: 'gateway',
			    renderer: renderer_generator('gateway'),
			},
			{
			    header: gettext('VLAN ID'),
			    hidden: true,
			    sortable: true,
			    dataIndex: 'vlan-id',
			},
			{
			    header: gettext('VLAN raw device'),
			    hidden: true,
			    sortable: true,
			    dataIndex: 'vlan-raw-device',
			},
			{
			    header: 'MTU',
			    hidden: true,
			    sortable: true,
			    dataIndex: 'mtu',
			},
			{
			    header: gettext('Comment'),
			    dataIndex: 'comments',
			    flex: 1,
			    renderer: Ext.String.htmlEncode,
			},
		    ],
		    listeners: {
			selectionchange: set_button_status,
			itemdblclick: run_editor,
		    },
		},
		{
		    border: false,
		    region: 'south',
		    autoScroll: true,
		    hidden: true,
		    itemId: 'changes',
		    tbar: [
			gettext('Pending changes') + ' (' +
			    gettext("Either reboot or use 'Apply Configuration' (needs ifupdown2) to activate") + ')',
		    ],
		    split: true,
		    bodyPadding: 5,
		    flex: 0.6,
		    html: gettext("No changes"),
		},
	    ],
	});

	me.callParent();
	reload();
    },
});

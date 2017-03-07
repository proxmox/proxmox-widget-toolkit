Ext.define('proxmox-networks', {
    extend: 'Ext.data.Model',
    fields: [
	'iface', 'type', 'active', 'autostart',
	'bridge_ports', 'slaves',
	'address', 'netmask', 'gateway',
	'address6', 'netmask6', 'gateway6',
	'comments'
    ],
    idProperty: 'iface'
});

Ext.define('Proxmox.node.NetworkView', {
    extend: 'Ext.panel.Panel',

    alias: ['widget.proxmoxNodeNetworkView'],

    initComponent : function() {
	var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	var baseUrl = '/nodes/' + me.nodename + '/network';

	var store = Ext.create('Ext.data.Store', {
	    model: 'proxmox-networks',
	    proxy: {
                type: 'proxmox',
                url: '/api2/json' + baseUrl
	    },
	    sorters: [
		{
		    property : 'iface',
		    direction: 'ASC'
		}
	    ]
	});

	var reload = function() {
	    var changeitem = me.down('#changes');
	    Proxmox.Utils.API2Request({
		url: baseUrl,
		failure: function(response, opts) {
		    changeitem.update(gettext('Error') + ': ' + response.htmlStatus);
		    store.loadData({});
		    changeitem.setHidden(true);
		},
		success: function(response, opts) {
		    var result = Ext.decode(response.responseText);
		    store.loadData(result.data);
		    var changes = result.changes;
		    if (changes === undefined || changes === '') {
			changes = gettext("No changes");
			changeitem.setHidden(true);
		    } else {
			changeitem.update("<pre>" + Ext.htmlEncode(changes) + "</pre>");
			changeitem.setHidden(false);
		    }
		}
	    });
	};

	var run_editor = function() {
	    var grid = me.down('gridpanel');
	    var sm = grid.getSelectionModel();
	    var rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }

	    var win = Ext.create('Proxmox.node.NetworkEdit', {
		nodename: me.nodename,
		iface: rec.data.iface,
		iftype: rec.data.type
	    });
	    win.show();
	    win.on('destroy', reload);
	};

	var edit_btn = new Ext.Button({
	    text: gettext('Edit'),
	    disabled: true,
	    handler: run_editor
	});

	var del_btn = new Ext.Button({
	    text: gettext('Remove'),
	    disabled: true,
	    handler: function(){
		var grid = me.down('gridpanel');
		var sm = grid.getSelectionModel();
		var rec = sm.getSelection()[0];
		if (!rec) {
		    return;
		}

		var iface = rec.data.iface;

		Proxmox.Utils.API2Request({
		    url: baseUrl + '/' + iface,
		    method: 'DELETE',
		    waitMsgTarget: me,
		    callback: function() {
			reload();
		    },
		    failure: function(response, opts) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    }
		});
	    }
	});

	var set_button_status = function() {
	    var grid = me.down('gridpanel');
	    var sm = grid.getSelectionModel();
	    var rec = sm.getSelection()[0];

	    edit_btn.setDisabled(!rec);
	    del_btn.setDisabled(!rec);
	};

	Proxmox.Utils.monStoreErrors(me, store);

	var render_ports = function(value, metaData, record) {
	    if (value === 'bridge') {
		return record.data.bridge_ports;
	    } else if (value === 'bond') {
		return record.data.slaves;
	    } else if (value === 'OVSBridge') {
		return record.data.ovs_ports;
	    } else if (value === 'OVSBond') {
		return record.data.ovs_bonds;
	    }
	};

	var find_next_iface_id = function(prefix) {
	    var next;
	    for (next = 0; next <= 9999; next++) {
		if (!store.getById(prefix + next.toString())) {
		    break;
		}
	    }
	    return prefix + next.toString();
	};

	Ext.apply(me, {
	    layout: 'border',
	    tbar: [
		{
		    text: gettext('Create'),
		    menu: new Ext.menu.Menu({
			plain: true,
			items: [
			    {
				text: Proxmox.Utils.render_network_iface_type('bridge'),
				handler: function() {
				    var win = Ext.create('Proxmox.node.NetworkEdit', {
					nodename: me.nodename,
					iftype: 'bridge',
					iface_default: find_next_iface_id('vmbr')
				    });
				    win.on('destroy', reload);
				    win.show();
				}
			    },
			    {
				text: Proxmox.Utils.render_network_iface_type('bond'),
				handler: function() {
				    var win = Ext.create('Proxmox.node.NetworkEdit', {
					nodename: me.nodename,
					iftype: 'bond',
					iface_default: find_next_iface_id('bond')
				    });
				    win.on('destroy', reload);
				    win.show();
				}
			    }, '-',
			    {
				text: Proxmox.Utils.render_network_iface_type('OVSBridge'),
				handler: function() {
				    var win = Ext.create('Proxmox.node.NetworkEdit', {
					nodename: me.nodename,
					iftype: 'OVSBridge',
					iface_default: find_next_iface_id('vmbr')
				    });
				    win.on('destroy', reload);
				    win.show();
				}
			    },
			    {
				text: Proxmox.Utils.render_network_iface_type('OVSBond'),
				handler: function() {
				    var win = Ext.create('Proxmox.node.NetworkEdit', {
					nodename: me.nodename,
					iftype: 'OVSBond',
					iface_default: find_next_iface_id('bond')
				    });
				    win.on('destroy', reload);
				    win.show();
				}
			    },
			    {
				text: Proxmox.Utils.render_network_iface_type('OVSIntPort'),
				handler: function() {
				    var win = Ext.create('Proxmox.node.NetworkEdit', {
					nodename: me.nodename,
					iftype: 'OVSIntPort'
				    });
				    win.on('destroy', reload);
				    win.show();
				}
			    }
			]
		    })
		}, ' ',
		{
		    text: gettext('Revert'),
		    handler: function() {
			Proxmox.Utils.API2Request({
			    url: baseUrl,
			    method: 'DELETE',
			    waitMsgTarget: me,
			    callback: function() {
				reload();
			    },
			    failure: function(response, opts) {
				Ext.Msg.alert(gettext('Error'), response.htmlStatus);
			    }
			});
		    }
		},
		edit_btn,
		del_btn
	    ],
	    items: [
		{
		    xtype: 'gridpanel',
		    stateful: true,
		    stateId: 'grid-node-network',
		    store: store,
		    region: 'center',
		    border: false,
		    columns: [
			{
			    header: gettext('Name'),
			    sortable: true,
			    dataIndex: 'iface'
			},
			{
			    header: gettext('Type'),
			    sortable: true,
			    width: 120,
			    renderer: Proxmox.Utils.render_network_iface_type,
			    dataIndex: 'type'
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('Active'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'active',
			    trueText: 'Yes',
			    falseText: 'No',
			    undefinedText: 'No'
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('Autostart'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'autostart',
			    trueText: 'Yes',
			    falseText: 'No',
			    undefinedText: 'No'
			},
			{
			    header: gettext('Ports/Slaves'),
			    dataIndex: 'type',
			    renderer: render_ports
			},
			{
			    header: gettext('IP address'),
			    sortable: true,
			    width: 120,
			    dataIndex: 'address',
			    renderer: function(value, metaData, rec) {
				if (rec.data.address && rec.data.address6) {
				    return rec.data.address + "<br>"
				           + rec.data.address6 + '/' + rec.data.netmask6;
				} else if (rec.data.address6) {
				    return rec.data.address6 + '/' + rec.data.netmask6;
				} else {
				    return rec.data.address;
				}
			    }
			},
			{
			    header: gettext('Subnet mask'),
			    width: 120,
			    sortable: true,
			    dataIndex: 'netmask'
			},
			{
			    header: gettext('Gateway'),
			    width: 120,
			    sortable: true,
			    dataIndex: 'gateway',
			    renderer: function(value, metaData, rec) {
				if (rec.data.gateway && rec.data.gateway6) {
				    return rec.data.gateway + "<br>" + rec.data.gateway6;
				} else if (rec.data.gateway6) {
				    return rec.data.gateway6;
				} else {
				    return rec.data.gateway;
				}
			    }
			},
			{
			    header: gettext('Comment'),
			    dataIndex: 'comments',
			    flex: 1,
			    renderer: Ext.String.htmlEncode
			}
		    ],
		    listeners: {
			selectionchange: set_button_status,
			itemdblclick: run_editor
		    }
		},
		{
		    border: false,
		    region: 'south',
		    autoScroll: true,
		    hidden: true,
		    itemId: 'changes',
		    tbar: [
			gettext('Pending changes') + ' (' +
			    gettext('Please reboot to activate changes') + ')'
		    ],
		    split: true,
		    bodyPadding: 5,
		    flex: 0.6,
		    html: gettext("No changes")
		}
	    ],
	    listeners: {
		activate: reload
	    }
	});

	me.callParent();
    }
});

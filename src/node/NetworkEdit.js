Ext.define('Proxmox.node.NetworkEdit', {
    extend: 'Proxmox.window.Edit',
    alias: ['widget.proxmoxNodeNetworkEdit'],

    // Enable to show the VLAN ID field
    bridge_set_vids: false,

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	if (!me.iftype) {
	    throw "no network device type specified";
	}

	me.isCreate = !me.iface;

	let iface_vtype;

	if (me.iftype === 'bridge') {
	    iface_vtype = 'BridgeName';
	} else if (me.iftype === 'bond') {
	    iface_vtype = 'BondName';
	} else if (me.iftype === 'eth' && !me.isCreate) {
	    iface_vtype = 'InterfaceName';
	} else if (me.iftype === 'vlan') {
	    iface_vtype = 'VlanName';
	} else if (me.iftype === 'OVSBridge') {
	    iface_vtype = 'BridgeName';
	} else if (me.iftype === 'OVSBond') {
	    iface_vtype = 'BondName';
	} else if (me.iftype === 'OVSIntPort') {
	    iface_vtype = 'InterfaceName';
	} else if (me.iftype === 'OVSPort') {
	    iface_vtype = 'InterfaceName';
	} else {
	    console.log(me.iftype);
	    throw "unknown network device type specified";
	}

	me.subject = Proxmox.Utils.render_network_iface_type(me.iftype);

	let column1 = [],
	    column2 = [],
	    columnB = [],
	    advancedColumn1 = [],
	    advancedColumn2 = [];

	if (!(me.iftype === 'OVSIntPort' || me.iftype === 'OVSPort' || me.iftype === 'OVSBond')) {
	    column2.push({
		xtype: 'proxmoxcheckbox',
		fieldLabel: gettext('Autostart'),
		name: 'autostart',
		uncheckedValue: 0,
		checked: me.isCreate ? true : undefined,
	    });
	}

	if (me.iftype === 'bridge') {
	    let vids = Ext.create('Ext.form.field.Text', {
		fieldLabel: gettext('VLAN IDs'),
		name: 'bridge_vids',
		emptyText: '2-4094',
		disabled: true,
		autoEl: {
		    tag: 'div',
		    'data-qtip': gettext("List of VLAN IDs and ranges, useful for NICs with restricted VLAN offloading support. For example: '2 4 100-200'"),
		},
		validator: function(value) {
		    if (!value) { // empty
			return true;
		    }

		    for (const vid of value.split(/\s+[,;]?/)) {
			if (!vid) {
			    continue;
			}
			let res = vid.match(/^(\d+)(?:-(\d+))?$/);
			if (!res) {
			    return Ext.String.format(gettext("not a valid bridge VLAN ID entry: {0}"), vid);
			}
			let start = Number(res[1]), end = Number(res[2] ?? res[1]); // end=start for single IDs

			if (Number.isNaN(start) || Number.isNaN(end)) {
			    return Ext.String.format(gettext('VID range includes not-a-number: {0}'), vid);
			} else if (start > end) {
			    return Ext.String.format(gettext('VID range must go from lower to higher tag: {0}'), vid);
			} else if (start < 2 || end > 4094) { // check just one each, we already ensured start < end
			    return Ext.String.format(gettext('VID range outside of allowed 2 and 4094 limit: {0}'), vid);
			}
		    }
		    return true;
		},
	    });
	    column2.push({
		xtype: 'proxmoxcheckbox',
		fieldLabel: gettext('VLAN aware'),
		name: 'bridge_vlan_aware',
		deleteEmpty: !me.isCreate,
		listeners: {
		    change: function(f, newVal) {
			if (me.bridge_set_vids) {
			    vids.setDisabled(!newVal);
			}
		    },
		},
	    });
	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('Bridge ports'),
		name: 'bridge_ports',
		autoEl: {
		    tag: 'div',
		    'data-qtip': gettext('Space-separated list of interfaces, for example: enp0s0 enp1s0'),
		},
	    });
	    if (me.bridge_set_vids) {
		advancedColumn2.push(vids);
	    }
	} else if (me.iftype === 'OVSBridge') {
	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('Bridge ports'),
		name: 'ovs_ports',
		autoEl: {
		    tag: 'div',
		    'data-qtip': gettext('Space-separated list of interfaces, for example: enp0s0 enp1s0'),
		},
	    });
	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('OVS options'),
		name: 'ovs_options',
	    });
	} else if (me.iftype === 'OVSPort' || me.iftype === 'OVSIntPort') {
	    column2.push({
		xtype: me.isCreate ? 'PVE.form.BridgeSelector' : 'displayfield',
		fieldLabel: Proxmox.Utils.render_network_iface_type('OVSBridge'),
		allowBlank: false,
		nodename: me.nodename,
		bridgeType: 'OVSBridge',
		name: 'ovs_bridge',
	    });
	    column2.push({
		xtype: 'proxmoxvlanfield',
		deleteEmpty: !me.isCreate,
		name: 'ovs_tag',
		value: '',
	    });
	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('OVS options'),
		name: 'ovs_options',
	    });
	} else if (me.iftype === 'vlan') {
	    if (!me.isCreate) {
		me.disablevlanid = false;
		me.disablevlanrawdevice = false;
		me.vlanrawdevicevalue = '';
		me.vlanidvalue = '';

		if (Proxmox.Utils.VlanInterface_match.test(me.iface)) {
		   me.disablevlanid = true;
		   me.disablevlanrawdevice = true;
		   let arr = Proxmox.Utils.VlanInterface_match.exec(me.iface);
		   me.vlanrawdevicevalue = arr[1];
		   me.vlanidvalue = arr[2];
		} else if (Proxmox.Utils.Vlan_match.test(me.iface)) {
		   me.disablevlanid = true;
		   let arr = Proxmox.Utils.Vlan_match.exec(me.iface);
		   me.vlanidvalue = arr[1];
		}
	    } else {
		me.disablevlanid = true;
		me.disablevlanrawdevice = true;
           }

	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('Vlan raw device'),
		name: 'vlan-raw-device',
		value: me.vlanrawdevicevalue,
		disabled: me.disablevlanrawdevice,
		allowBlank: false,
	    });

	    column2.push({
		xtype: 'proxmoxvlanfield',
		name: 'vlan-id',
		value: me.vlanidvalue,
		disabled: me.disablevlanid,
	    });

	    columnB.push({
		xtype: 'label',
		userCls: 'pmx-hint',
		text: 'Either add the VLAN number to an existing interface name, or choose your own name and set the VLAN raw device (for the latter ifupdown1 supports vlanXY naming only)',
	    });
	} else if (me.iftype === 'bond') {
	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('Slaves'),
		name: 'slaves',
	    });

	    let policySelector = Ext.createWidget('bondPolicySelector', {
		fieldLabel: gettext('Hash policy'),
		name: 'bond_xmit_hash_policy',
		deleteEmpty: !me.isCreate,
		disabled: true,
	    });

	    let primaryfield = Ext.createWidget('textfield', {
		fieldLabel: 'bond-primary',
		name: 'bond-primary',
		value: '',
		disabled: true,
	    });

	    column2.push({
		xtype: 'bondModeSelector',
		fieldLabel: gettext('Mode'),
		name: 'bond_mode',
		value: me.isCreate ? 'balance-rr' : undefined,
		listeners: {
		    change: function(f, value) {
			if (value === 'balance-xor' ||
			    value === '802.3ad') {
			    policySelector.setDisabled(false);
			    primaryfield.setDisabled(true);
			    primaryfield.setValue('');
			} else if (value === 'active-backup') {
			    primaryfield.setDisabled(false);
			    policySelector.setDisabled(true);
			    policySelector.setValue('');
			} else {
			    policySelector.setDisabled(true);
			    policySelector.setValue('');
			    primaryfield.setDisabled(true);
			    primaryfield.setValue('');
			}
		    },
		},
		allowBlank: false,
	    });

	    column2.push(policySelector);
	    column2.push(primaryfield);
	} else if (me.iftype === 'OVSBond') {
	    column2.push({
		xtype: me.isCreate ? 'PVE.form.BridgeSelector' : 'displayfield',
		fieldLabel: Proxmox.Utils.render_network_iface_type('OVSBridge'),
		allowBlank: false,
		nodename: me.nodename,
		bridgeType: 'OVSBridge',
		name: 'ovs_bridge',
	    });
	    column2.push({
		xtype: 'proxmoxvlanfield',
		deleteEmpty: !me.isCreate,
		name: 'ovs_tag',
		value: '',
	    });
	    column2.push({
		xtype: 'textfield',
		fieldLabel: gettext('OVS options'),
		name: 'ovs_options',
	    });
	}

	column2.push({
	    xtype: 'textfield',
	    fieldLabel: gettext('Comment'),
	    allowBlank: true,
	    nodename: me.nodename,
	    name: 'comments',
	});

	let url;
	let method;

	if (me.isCreate) {
	    url = "/api2/extjs/nodes/" + me.nodename + "/network";
	    method = 'POST';
	} else {
	    url = "/api2/extjs/nodes/" + me.nodename + "/network/" + me.iface;
	    method = 'PUT';
	}

	column1.push({
	    xtype: 'hiddenfield',
	    name: 'type',
	    value: me.iftype,
	},
	{
	    xtype: me.isCreate ? 'textfield' : 'displayfield',
	    fieldLabel: gettext('Name'),
	    name: 'iface',
	    value: me.iface,
	    vtype: iface_vtype,
	    allowBlank: false,
	    maxLength: iface_vtype === 'BridgeName' ? 10 : 15,
	    autoEl: {
		tag: 'div',
		 'data-qtip': gettext('For example, vmbr0.100, vmbr0, vlan0.100, vlan0'),
	    },
	    listeners: {
		change: function(f, value) {
		    if (me.isCreate && iface_vtype === 'VlanName') {
			let vlanidField = me.down('field[name=vlan-id]');
			let vlanrawdeviceField = me.down('field[name=vlan-raw-device]');
			if (Proxmox.Utils.VlanInterface_match.test(value)) {
			    vlanidField.setDisabled(true);
			    vlanrawdeviceField.setDisabled(true);
			    // User defined those values in the `iface` (Name)
			    // field. Match them (instead of leaving the
			    // previous value) to make clear what is submitted
			    // and how the fields `iface`, `vlan-id` and
			    // `vlan-raw-device` are connected
			    vlanidField.setValue(
				value.match(Proxmox.Utils.VlanInterface_match)[2],
			    );
			    vlanrawdeviceField.setValue(
				value.match(Proxmox.Utils.VlanInterface_match)[1],
			    );
			} else if (Proxmox.Utils.Vlan_match.test(value)) {
			    vlanidField.setDisabled(true);
			    vlanidField.setValue(
				value.match(Proxmox.Utils.Vlan_match)[1],
			    );
			    vlanrawdeviceField.setDisabled(false);
			} else {
			    vlanidField.setDisabled(false);
			    vlanrawdeviceField.setDisabled(false);
			}
		    }
		},
	    },
	});

	if (me.iftype === 'OVSBond') {
	    column1.push(
		{
		    xtype: 'bondModeSelector',
		    fieldLabel: gettext('Mode'),
		    name: 'bond_mode',
		    openvswitch: true,
		    value: me.isCreate ? 'active-backup' : undefined,
		    allowBlank: false,
		},
		{
		    xtype: 'textfield',
		    fieldLabel: gettext('Slaves'),
		    name: 'ovs_bonds',
		},
	    );
	} else {
	    column1.push(
		{
		    xtype: 'proxmoxtextfield',
		    deleteEmpty: !me.isCreate,
		    fieldLabel: 'IPv4/CIDR',
		    vtype: 'IPCIDRAddress',
		    name: 'cidr',
		},
		{
		    xtype: 'proxmoxtextfield',
		    deleteEmpty: !me.isCreate,
		    fieldLabel: gettext('Gateway') + ' (IPv4)',
		    vtype: 'IPAddress',
		    name: 'gateway',
		},
		{
		    xtype: 'proxmoxtextfield',
		    deleteEmpty: !me.isCreate,
		    fieldLabel: 'IPv6/CIDR',
		    vtype: 'IP6CIDRAddress',
		    name: 'cidr6',
		},
		{
		    xtype: 'proxmoxtextfield',
		    deleteEmpty: !me.isCreate,
		    fieldLabel: gettext('Gateway') + ' (IPv6)',
		    vtype: 'IP6Address',
		    name: 'gateway6',
		},
	    );
	}
	advancedColumn1.push(
	    {
		xtype: 'proxmoxintegerfield',
		minValue: 1280,
		maxValue: 65520,
		deleteEmpty: !me.isCreate,
		emptyText: 1500,
		fieldLabel: 'MTU',
		name: 'mtu',
	    },
	);

	Ext.applyIf(me, {
	    url: url,
	    method: method,
	    items: {
                xtype: 'inputpanel',
		column1: column1,
		column2: column2,
		columnB: columnB,
		advancedColumn1: advancedColumn1,
		advancedColumn2: advancedColumn2,
	    },
	});

	me.callParent();

	if (me.isCreate) {
	    me.down('field[name=iface]').setValue(me.iface_default);
	} else {
	    me.load({
		success: function(response, options) {
		    let data = response.result.data;
		    if (data.type !== me.iftype) {
			let msg = "Got unexpected device type";
			Ext.Msg.alert(gettext('Error'), msg, function() {
			    me.close();
			});
			return;
		    }
		    me.setValues(data);
		    me.isValid(); // trigger validation
		},
	    });
	}
    },
});

Ext.define('Proxmox.form.BondModeSelector', {
    extend: 'Proxmox.form.KVComboBox',
    alias: ['widget.bondModeSelector'],

    openvswitch: false,

    initComponent: function() {
	let me = this;

	if (me.openvswitch) {
	    me.comboItems = Proxmox.Utils.bond_mode_array([
	       'active-backup',
	       'balance-slb',
	       'lacp-balance-slb',
	       'lacp-balance-tcp',
	    ]);
	} else {
	    me.comboItems = Proxmox.Utils.bond_mode_array([
		'balance-rr',
		'active-backup',
		'balance-xor',
		'broadcast',
		'802.3ad',
		'balance-tlb',
		'balance-alb',
	    ]);
	}

	me.callParent();
    },
});

Ext.define('Proxmox.form.BondPolicySelector', {
    extend: 'Proxmox.form.KVComboBox',
    alias: ['widget.bondPolicySelector'],
    comboItems: [
	    ['layer2', 'layer2'],
	    ['layer2+3', 'layer2+3'],
	    ['layer3+4', 'layer3+4'],
    ],
});


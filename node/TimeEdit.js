Ext.define('Proxmox.node.TimeEdit', {
    extend: 'Proxmox.window.Edit',
    alias: ['widget.proxmoxNodeTimeEdit'],

    subject: gettext('Time zone'),

    width: 400,

    autoLoad: true,

    fieldDefaults: {
	labelWidth: 70,
    },

    items: {
	xtype: 'combo',
	fieldLabel: gettext('Time zone'),
	name: 'timezone',
	queryMode: 'local',
	store: Ext.create('Proxmox.data.TimezoneStore'),
	displayField: 'zone',
	editable: true,
	anyMatch: true,
	forceSelection: true,
	allowBlank: false,
    },

    initComponent: function() {
	var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}
	me.url = "/api2/extjs/nodes/" + me.nodename + "/time";

	me.callParent();
    },
});

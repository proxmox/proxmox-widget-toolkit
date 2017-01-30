Ext.define('Proxmox.node.TimeEdit', {
    extend: 'Proxmox.window.Edit',
    alias: ['widget.proxmoxNodeTimeEdit'],

    initComponent : function() {
	var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	Ext.applyIf(me, {
	    subject: gettext('Time zone'),
	    url: "/api2/extjs/nodes/" + me.nodename + "/time",
	    fieldDefaults: {
		labelWidth: 70
            },
	    width: 400,
	    items: {
		xtype: 'combo',
		fieldLabel: gettext('Time zone'),
		name: 'timezone',
		queryMode: 'local',
		store: Ext.create('Proxmox.data.TimezoneStore'),
		valueField: 'zone',
		displayField: 'zone',
		triggerAction: 'all',
		forceSelection: true,
		editable: false,
		allowBlank: false
	    }
	});

	me.callParent();

	me.load();
    }
});

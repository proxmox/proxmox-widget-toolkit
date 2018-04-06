Ext.define('Proxmox.node.TimeView', {
    extend: 'Proxmox.grid.ObjectGrid',
    alias: ['widget.proxmoxNodeTimeView'],

    initComponent : function() {
	var me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	var tzoffset = (new Date()).getTimezoneOffset()*60000;
	var renderlocaltime = function(value) {
	    var servertime = new Date((value * 1000) + tzoffset);
	    return Ext.Date.format(servertime, 'Y-m-d H:i:s');
	};

	var run_editor = function() {
	    var win = Ext.create('Proxmox.node.TimeEdit', {
		nodename: me.nodename
	    });
	    win.show();
	};

	Ext.apply(me, {
	    url: "/api2/json/nodes/" + me.nodename + "/time",
	    cwidth1: 150,
	    interval: 1000,
	    run_editor: run_editor,
	    rows: {
		timezone: { 
		    header: gettext('Time zone'), 
		    required: true
		},
		localtime: { 
		    header: gettext('Server time'), 
		    required: true, 
		    renderer: renderlocaltime 
		}
	    },
	    tbar: [ 
		{
		    text: gettext("Edit"),
		    handler: run_editor
		}
	    ],
	    listeners: {
		itemdblclick: run_editor
	    }
	});

	me.callParent();

	me.on('activate', me.rstore.startUpdate);
	me.on('deactivate', me.rstore.stopUpdate);
	me.on('destroy', me.rstore.stopUpdate);
    }
});

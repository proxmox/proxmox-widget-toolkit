Ext.define('Proxmox.node.Tasks', {
    extend: 'Ext.grid.GridPanel',

    alias: ['widget.proxmoxNodeTasks'],
    stateful: true,
    stateId: 'grid-node-tasks',
    loadMask: true,
    sortableColumns: false,
    vmidFilter: 0,

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	let store = Ext.create('Ext.data.BufferedStore', {
	    pageSize: 500,
	    autoLoad: true,
	    remoteFilter: true,
	    model: 'proxmox-tasks',
	    proxy: {
                type: 'proxmox',
		startParam: 'start',
		limitParam: 'limit',
                url: "/api2/json/nodes/" + me.nodename + "/tasks",
	    },
	});

	store.on('prefetch', function() {
	    // we want to update the scrollbar on every store load
	    // since the total count might be different
	    // the buffered grid plugin does this only on scrolling itself
	    // and even reduces the scrollheight again when scrolling up
	    me.updateLayout();
	});

	let userfilter = '';
	let filter_errors = 0;

	let updateProxyParams = function() {
	    let params = {
		errors: filter_errors,
	    };
	    if (userfilter) {
		params.userfilter = userfilter;
	    }
	    if (me.vmidFilter) {
		params.vmid = me.vmidFilter;
	    }
	    store.proxy.extraParams = params;
	};

	updateProxyParams();

	let reload_task = Ext.create('Ext.util.DelayedTask', function() {
	    updateProxyParams();
	    store.reload();
	});

	let run_task_viewer = function() {
	    let sm = me.getSelectionModel();
	    let rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }

	    let win = Ext.create('Proxmox.window.TaskViewer', {
		upid: rec.data.upid,
		endtime: rec.data.endtime,
	    });
	    win.show();
	};

	let view_btn = new Ext.Button({
	    text: gettext('View'),
	    disabled: true,
	    handler: run_task_viewer,
	});

	Proxmox.Utils.monStoreErrors(me, store, true);

	Ext.apply(me, {
	    store: store,
	    viewConfig: {
		trackOver: false,
		stripeRows: false, // does not work with getRowClass()

		getRowClass: function(record, index) {
		    let status = record.get('status');

		    if (status) {
			let parsed = Proxmox.Utils.parse_task_status(status);
			if (parsed === 'error') {
			    return "proxmox-invalid-row";
			} else if (parsed === 'warning') {
			    return "proxmox-warning-row";
			}
		    }
		    return '';
		},
	    },
	    tbar: [
		view_btn,
		{
		    text: gettext('Refresh'), // FIXME: smart-auto-refresh store
		    handler: () => store.reload(),
		},
		'->',
		gettext('User name') +':',
		' ',
		{
		    xtype: 'textfield',
		    width: 200,
		    value: userfilter,
		    enableKeyEvents: true,
		    listeners: {
			keyup: function(field, e) {
			    userfilter = field.getValue();
			    reload_task.delay(500);
			},
		    },
		}, ' ', gettext('Only Errors') + ':', ' ',
		{
		    xtype: 'checkbox',
		    hideLabel: true,
		    checked: filter_errors,
		    listeners: {
			change: function(field, checked) {
			    filter_errors = checked ? 1 : 0;
			    reload_task.delay(10);
			},
		    },
		}, ' ',
	    ],
	    columns: [
		{
		    header: gettext("Start Time"),
		    dataIndex: 'starttime',
		    width: 130,
		    renderer: function(value) {
			return Ext.Date.format(value, "M d H:i:s");
		    },
		},
		{
		    header: gettext("End Time"),
		    dataIndex: 'endtime',
		    width: 130,
		    renderer: function(value, metaData, record) {
			if (!value) {
			    metaData.tdCls = "x-grid-row-loading";
			    return '';
			}
			return Ext.Date.format(value, "M d H:i:s");
		    },
		},
		{
		    header: gettext("Duration"),
		    hidden: true,
		    width: 80,
		    renderer: function(value, metaData, record) {
			let start = record.data.starttime;
			if (start) {
			    let end = record.data.endtime || Date.now();
			    let duration = end - start;
			    if (duration > 0) {
				duration /= 1000;
			    }
			    return Proxmox.Utils.format_duration_human(duration);
			}
			return Proxmox.Utils.unknownText;
		    },
		},
		{
		    header: gettext("Node"),
		    dataIndex: 'node',
		    width: 120,
		},
		{
		    header: gettext("User name"),
		    dataIndex: 'user',
		    width: 150,
		},
		{
		    header: gettext("Description"),
		    dataIndex: 'upid',
		    flex: 1,
		    renderer: Proxmox.Utils.render_upid,
		},
		{
		    header: gettext("Status"),
		    dataIndex: 'status',
		    width: 200,
		    renderer: function(value, metaData, record) {
			if (value === undefined && !record.data.endtime) {
			    metaData.tdCls = "x-grid-row-loading";
			    return '';
			}

			let parsed = Proxmox.Utils.parse_task_status(value);
			switch (parsed) {
			    case 'unknown': return Proxmox.Utils.unknownText;
			    case 'error': return Proxmox.Utils.errorText + ': ' + value;
			    case 'ok': // fall-through
			    case 'warning': // fall-through
			    default: return value;
			}
		    },
		},
	    ],
	    listeners: {
		itemdblclick: run_task_viewer,
		selectionchange: function(v, selections) {
		    view_btn.setDisabled(!(selections && selections[0]));
		},
		show: function() { reload_task.delay(10); },
		destroy: function() { reload_task.cancel(); },
	    },
	});

	me.callParent();
    },
});

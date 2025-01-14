Ext.define('Proxmox.window.TaskProgress', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxTaskProgress',

    taskDone: Ext.emptyFn,

    width: 300,
    layout: 'auto',
    modal: true,
    bodyPadding: 5,

    initComponent: function() {
        let me = this;

	if (!me.upid) {
	    throw "no task specified";
	}

	let task = Proxmox.Utils.parse_task_upid(me.upid);

	let statstore = Ext.create('Proxmox.data.ObjectStore', {
	    url: `/api2/json/nodes/${task.node}/tasks/${encodeURIComponent(me.upid)}/status`,
	    interval: 1000,
	    rows: {
		status: { defaultValue: 'unknown' },
		exitstatus: { defaultValue: 'unknown' },
	    },
	});

	me.on('destroy', statstore.stopUpdate);

	let getObjectValue = function(key, defaultValue) {
	    let rec = statstore.getById(key);
	    if (rec) {
		return rec.data.value;
	    }
	    return defaultValue;
	};

	let pbar = Ext.create('Ext.ProgressBar');

	me.mon(statstore, 'load', function() {
	    let status = getObjectValue('status');
	    if (status === 'stopped') {
		let exitstatus = getObjectValue('exitstatus');
		if (exitstatus === 'OK') {
		    pbar.reset();
		    pbar.updateText("Done!");
		    Ext.Function.defer(me.close, 1000, me);
		} else {
		    me.close();
		    Ext.Msg.alert('Task failed', exitstatus);
		}
		me.taskDone(exitstatus === 'OK');
	    }
	});

	let descr = Proxmox.Utils.format_task_description(task.type, task.id);

	Ext.apply(me, {
	    title: gettext('Task') + ': ' + descr,
	    items: pbar,
	    buttons: [
		{
		    text: gettext('Details'),
		    handler: function() {
			Ext.create('Proxmox.window.TaskViewer', {
			    autoShow: true,
			    taskDone: me.taskDone,
			    upid: me.upid,
			});
			me.close();
		    },
		},
	    ],
	});

	me.callParent();

	statstore.startUpdate();

	pbar.wait({ text: gettext('running...') });
    },
});

Ext.define('Proxmox.window.TaskViewer', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxTaskViewer',

    extraTitle: '', // string to prepend after the generic task title

    taskDone: Ext.emptyFn,

    initComponent: function() {
        let me = this;

	if (!me.upid) {
	    throw "no task specified";
	}

	let task = Proxmox.Utils.parse_task_upid(me.upid);

	let statgrid;

	let rows = {
	    status: {
		header: gettext('Status'),
		defaultValue: 'unknown',
		renderer: function(value) {
		    if (value !== 'stopped') {
			return Ext.htmlEncode(value);
		    }
		    let es = statgrid.getObjectValue('exitstatus');
		    if (es) {
			return Ext.htmlEncode(`${value}: ${es}`);
		    }
		    return 'unknown';
		},
	    },
	    exitstatus: {
		visible: false,
	    },
	    type: {
		header: gettext('Task type'),
		required: true,
	    },
	    user: {
		header: gettext('User name'),
		renderer: function(value) {
		    let user = value;
		    let tokenid = statgrid.getObjectValue('tokenid');
		    if (tokenid) {
			user += `!${tokenid} (API Token)`;
		    }
		    return Ext.String.htmlEncode(user);
		},
		required: true,
	    },
	    tokenid: {
		header: gettext('API Token'),
		renderer: Ext.String.htmlEncode,
		visible: false,
	    },
	    node: {
		header: gettext('Node'),
		required: true,
	    },
	    pid: {
		header: gettext('Process ID'),
		required: true,
	    },
	    task_id: {
		header: gettext('Task ID'),
	    },
	    starttime: {
		header: gettext('Start Time'),
		required: true,
		renderer: Proxmox.Utils.render_timestamp,
	    },
	    upid: {
		header: gettext('Unique task ID'),
		renderer: Ext.String.htmlEncode,
	    },
	};

	if (me.endtime) {
	    if (typeof me.endtime === 'object') {
		// convert to epoch
		me.endtime = parseInt(me.endtime.getTime()/1000, 10);
	    }
	    rows.endtime = {
		header: gettext('End Time'),
		required: true,
		renderer: function() {
		    return Proxmox.Utils.render_timestamp(me.endtime);
		},
	    };
	}

	rows.duration = {
	    header: gettext('Duration'),
	    required: true,
	    renderer: function() {
		let starttime = statgrid.getObjectValue('starttime');
		let endtime = me.endtime || Date.now()/1000;
		let duration = endtime - starttime;
		return Proxmox.Utils.format_duration_human(duration);
	    },
	};

	let statstore = Ext.create('Proxmox.data.ObjectStore', {
            url: `/api2/json/nodes/${task.node}/tasks/${encodeURIComponent(me.upid)}/status`,
	    interval: 1000,
	    rows: rows,
	});

	me.on('destroy', statstore.stopUpdate);

	let stop_task = function() {
	    Proxmox.Utils.API2Request({
		url: `/nodes/${task.node}/tasks/${encodeURIComponent(me.upid)}`,
		waitMsgTarget: me,
		method: 'DELETE',
		failure: response => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
	    });
	};

	let stop_btn1 = new Ext.Button({
	    text: gettext('Stop'),
	    disabled: true,
	    handler: stop_task,
	});

	let stop_btn2 = new Ext.Button({
	    text: gettext('Stop'),
	    disabled: true,
	    handler: stop_task,
	});

	statgrid = Ext.create('Proxmox.grid.ObjectGrid', {
	    title: gettext('Status'),
	    layout: 'fit',
	    tbar: [stop_btn1],
	    rstore: statstore,
	    rows: rows,
	    border: false,
	});

	let downloadBtn = new Ext.Button({
	    text: gettext('Download'),
	    iconCls: 'fa fa-download',
	    handler: () => Proxmox.Utils.downloadAsFile(
	        `/api2/json/nodes/${task.node}/tasks/${encodeURIComponent(me.upid)}/log?download=1`),
	});


	let logView = Ext.create('Proxmox.panel.LogView', {
	    title: gettext('Output'),
	    tbar: [stop_btn2, '->', downloadBtn],
	    border: false,
	    url: `/api2/extjs/nodes/${task.node}/tasks/${encodeURIComponent(me.upid)}/log`,
	});

	me.mon(statstore, 'load', function() {
	    let status = statgrid.getObjectValue('status');

	    if (status === 'stopped') {
		logView.scrollToEnd = false;
		logView.requestUpdate();
		statstore.stopUpdate();
		me.taskDone(statgrid.getObjectValue('exitstatus') === 'OK');
	    }

	    stop_btn1.setDisabled(status !== 'running');
	    stop_btn2.setDisabled(status !== 'running');
	    downloadBtn.setDisabled(status === 'running');
	});

	statstore.startUpdate();

	Ext.apply(me, {
	    title: "Task viewer: " + task.desc + me.extraTitle,
	    width: 800,
	    height: 500,
	    layout: 'fit',
	    modal: true,
	    items: [{
		xtype: 'tabpanel',
		region: 'center',
		items: [logView, statgrid],
	    }],
        });

	me.callParent();

	logView.fireEvent('show', logView);
    },
});


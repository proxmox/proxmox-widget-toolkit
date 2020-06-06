/*
 * Display log entries in a panel with scrollbar
 * The log entries are automatically refreshed via a background task,
 * with newest entries comming at the bottom
 */
Ext.define('Proxmox.panel.LogView', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxLogView',

    pageSize: 500,
    viewBuffer: 50,
    lineHeight: 16,

    scrollToEnd: true,

    // callback for load failure, used for ceph
    failCallback: undefined,

    controller: {
	xclass: 'Ext.app.ViewController',

	updateParams: function() {
	    let me = this;
	    let viewModel = me.getViewModel();
	    let since = viewModel.get('since');
	    let until = viewModel.get('until');
	    if (viewModel.get('hide_timespan')) {
		return;
	    }

	    if (since > until) {
		Ext.Msg.alert('Error', 'Since date must be less equal than Until date.');
		return;
	    }

	    viewModel.set('params.since', Ext.Date.format(since, 'Y-m-d'));
	    viewModel.set('params.until', Ext.Date.format(until, 'Y-m-d') + ' 23:59:59');
	    me.getView().loadTask.delay(200);
	},

	scrollPosBottom: function() {
	    let view = this.getView();
	    let pos = view.getScrollY();
	    let maxPos = view.getScrollable().getMaxPosition().y;
	    return maxPos - pos;
	},

	updateView: function(text, first, total) {
	    let me = this;
	    let view = me.getView();
	    let viewModel = me.getViewModel();
	    let content = me.lookup('content');
	    let data = viewModel.get('data');

	    if (first === data.first && total === data.total && text.length === data.textlen) {
		return; // same content, skip setting and scrolling
	    }
	    viewModel.set('data', {
		first: first,
		total: total,
		textlen: text.length,
	    });

	    let scrollPos = me.scrollPosBottom();

	    content.update(text);

	    if (view.scrollToEnd && scrollPos <= 0) {
		// we use setTimeout to work around scroll handling on touchscreens
		setTimeout(function() { view.scrollTo(0, Infinity); }, 10);
	    }
	},

	doLoad: function() {
	    let me = this;
	    if (me.running) {
		me.requested = true;
		return;
	    }
	    me.running = true;
	    let view = me.getView();
	    let viewModel = me.getViewModel();
	    Proxmox.Utils.API2Request({
		url: me.getView().url,
		params: viewModel.get('params'),
		method: 'GET',
		success: function(response) {
		    Proxmox.Utils.setErrorMask(me, false);
		    let total = response.result.total;
		    let lines = [];
		    let first = Infinity;

		    Ext.Array.each(response.result.data, function(line) {
			if (first > line.n) {
			    first = line.n;
			}
			lines[line.n - 1] = Ext.htmlEncode(line.t);
		    });

		    lines.length = total;
		    me.updateView(lines.join('<br>'), first - 1, total);
		    me.running = false;
		    if (me.requested) {
			me.requested = false;
			view.loadTask.delay(200);
		    }
		},
		failure: function(response) {
		    if (view.failCallback) {
			view.failCallback(response);
		    } else {
			let msg = response.htmlStatus;
			Proxmox.Utils.setErrorMask(me, msg);
		    }
		    me.running = false;
		    if (me.requested) {
			me.requested = false;
			view.loadTask.delay(200);
		    }
		},
	    });
	},

	onScroll: function(x, y) {
	    let me = this;
	    let view = me.getView();
	    let viewModel = me.getViewModel();

	    let lineHeight = view.lineHeight;
	    let line = view.getScrollY()/lineHeight;
	    let start = viewModel.get('params.start');
	    let limit = viewModel.get('params.limit');
	    let viewLines = view.getHeight()/lineHeight;

	    let viewStart = Math.max(parseInt(line - 1 - view.viewBuffer, 10), 0);
	    let viewEnd = parseInt(line + viewLines + 1 + view.viewBuffer, 10);

	    if (viewStart < start || viewEnd > start+limit) {
		viewModel.set('params.start',
		    Math.max(parseInt(line - (limit / 2) + 10, 10), 0));
		view.loadTask.delay(200);
	    }
	},

	init: function(view) {
	    let me = this;

	    if (!view.url) {
		throw "no url specified";
	    }

	    let viewModel = this.getViewModel();
	    let since = new Date();
	    since.setDate(since.getDate() - 3);
	    viewModel.set('until', new Date());
	    viewModel.set('since', since);
	    viewModel.set('params.limit', view.pageSize);
	    viewModel.set('hide_timespan', !view.log_select_timespan);
	    me.lookup('content').setStyle('line-height', view.lineHeight + 'px');

	    view.loadTask = new Ext.util.DelayedTask(me.doLoad, me);

	    me.updateParams();
	    view.task = Ext.TaskManager.start({
		run: function() {
		    if (!view.isVisible() || !view.scrollToEnd) {
			return;
		    }

		    if (me.scrollPosBottom() <= 1) {
			view.loadTask.delay(200);
		    }
		},
		interval: 1000,
	    });
	},
    },

    onDestroy: function() {
	let me = this;
	me.loadTask.cancel();
	Ext.TaskManager.stop(me.task);
    },

    // for user to initiate a load from outside
    requestUpdate: function() {
	let me = this;
	me.loadTask.delay(200);
    },

    viewModel: {
	data: {
	    until: null,
	    since: null,
	    hide_timespan: false,
	    data: {
		start: 0,
		total: 0,
		textlen: 0,
	    },
	    params: {
		start: 0,
		limit: 500,
	    },
	},
    },

    layout: 'auto',
    bodyPadding: 5,
    scrollable: {
	x: 'auto',
	y: 'auto',
	listeners: {
	    // we have to have this here, since we cannot listen to events
	    // of the scroller in the viewcontroller (extjs bug?), nor does
	    // the panel have a 'scroll' event'
	    scroll: {
		fn: function(scroller, x, y) {
		    let controller = this.component.getController();
		    if (controller) { // on destroy, controller can be gone
			controller.onScroll(x, y);
		    }
		},
		buffer: 200,
	    },
	},
    },

    tbar: {
	bind: {
	    hidden: '{hide_timespan}',
	},
	items: [
	    '->',
	    'Since: ',
	    {
		xtype: 'datefield',
		name: 'since_date',
		reference: 'since',
		format: 'Y-m-d',
		bind: {
		    value: '{since}',
		    maxValue: '{until}',
		},
	    },
	    'Until: ',
	    {
		xtype: 'datefield',
		name: 'until_date',
		reference: 'until',
		format: 'Y-m-d',
		bind: {
		    value: '{until}',
		    minValue: '{since}',
		},
	    },
	    {
		xtype: 'button',
		text: 'Update',
		handler: 'updateParams',
	    },
	],
    },

    items: [
	{
	    xtype: 'box',
	    reference: 'content',
	    style: {
		font: 'normal 11px tahoma, arial, verdana, sans-serif',
		'white-space': 'pre',
	    },
	},
    ],
});

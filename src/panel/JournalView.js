/*
 * Display log entries in a panel with scrollbar
 * The log entries are automatically refreshed via a background task,
 * with newest entries coming at the bottom
 */
Ext.define('Proxmox.panel.JournalView', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxJournalView',

    numEntries: 500,
    lineHeight: 16,

    scrollToEnd: true,

    controller: {
	xclass: 'Ext.app.ViewController',

	updateParams: function() {
	    let me = this;
	    let viewModel = me.getViewModel();
	    let since = viewModel.get('since');
	    let until = viewModel.get('until');

	    since.setHours(0, 0, 0, 0);
	    until.setHours(0, 0, 0, 0);
	    until.setDate(until.getDate()+1);

	    me.getView().loadTask.delay(200, undefined, undefined, [
		false,
		false,
		Ext.Date.format(since, "U"),
		Ext.Date.format(until, "U"),
	    ]);
	},

	scrollPosBottom: function() {
	    let view = this.getView();
	    let pos = view.getScrollY();
	    let maxPos = view.getScrollable().getMaxPosition().y;
	    return maxPos - pos;
	},

	scrollPosTop: function() {
	    let view = this.getView();
	    return view.getScrollY();
	},

	updateScroll: function(livemode, num, scrollPos, scrollPosTop) {
	    let me = this;
	    let view = me.getView();

	    if (!livemode) {
		setTimeout(function() { view.scrollTo(0, 0); }, 10);
	    } else if (view.scrollToEnd && scrollPos <= 5) {
		setTimeout(function() { view.scrollTo(0, Infinity); }, 10);
	    } else if (!view.scrollToEnd && scrollPosTop < 20 * view.lineHeight) {
		setTimeout(function() { view.scrollTo(0, (num * view.lineHeight) + scrollPosTop); }, 10);
	    }
	},

	updateView: function(lines, livemode, top) {
	    let me = this;
	    let view = me.getView();
	    let viewmodel = me.getViewModel();
	    if (!viewmodel || viewmodel.get('livemode') !== livemode) {
		return; // we switched mode, do not update the content
	    }
	    let contentEl = me.lookup('content');

	    // save old scrollpositions
	    let scrollPos = me.scrollPosBottom();
	    let scrollPosTop = me.scrollPosTop();

	    let newend = lines.shift();
	    let newstart = lines.pop();

	    let num = lines.length;
	    let text = lines.map(Ext.htmlEncode).join('<br>');

	    let contentChanged = true;

	    if (!livemode) {
		if (num) {
		    view.content = text;
		} else {
		    view.content = 'nothing logged or no timespan selected';
		}
	    } else {
		// update content
		if (top && num) {
		    view.content = view.content ? text + '<br>' + view.content : text;
		} else if (!top && num) {
		    view.content = view.content ? view.content + '<br>' + text : text;
		} else {
		    contentChanged = false;
		}

		// update cursors
		if (!top || !view.startcursor) {
		    view.startcursor = newstart;
		}

		if (top || !view.endcursor) {
		    view.endcursor = newend;
		}
	    }

	    if (contentChanged) {
		contentEl.update(view.content);
	    }

	    me.updateScroll(livemode, num, scrollPos, scrollPosTop);
	},

	doLoad: function(livemode, top, since, until) {
	    let me = this;
	    if (me.running) {
		me.requested = true;
		return;
	    }
	    me.running = true;
	    let view = me.getView();
	    let params = {
		lastentries: view.numEntries || 500,
	    };
	    if (livemode) {
		if (!top && view.startcursor) {
		    params = {
			startcursor: view.startcursor,
		    };
		} else if (view.endcursor) {
		    params.endcursor = view.endcursor;
		}
	    } else {
		params = {
		    since: since,
		    until: until,
		};
	    }
	    Proxmox.Utils.API2Request({
		url: view.url,
		params: params,
		waitMsgTarget: !livemode ? view : undefined,
		method: 'GET',
		success: function(response) {
		    Proxmox.Utils.setErrorMask(me, false);
		    let lines = response.result.data;
		    me.updateView(lines, livemode, top);
		    me.running = false;
		    if (me.requested) {
			me.requested = false;
			view.loadTask.delay(200);
		    }
		},
		failure: function(response) {
		    let msg = response.htmlStatus;
		    Proxmox.Utils.setErrorMask(me, msg);
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
	    let viewmodel = me.getViewModel();
	    let livemode = viewmodel.get('livemode');
	    if (!livemode) {
		return;
	    }

	    if (me.scrollPosTop() < 20*view.lineHeight) {
		view.scrollToEnd = false;
		view.loadTask.delay(200, undefined, undefined, [true, true]);
	    } else if (me.scrollPosBottom() <= 5) {
		view.scrollToEnd = true;
	    }
	},

	init: function(view) {
	    let me = this;

	    if (!view.url) {
		throw "no url specified";
	    }

	    let viewmodel = me.getViewModel();
	    let viewModel = this.getViewModel();
	    let since = new Date();
	    since.setDate(since.getDate() - 3);
	    viewModel.set('until', new Date());
	    viewModel.set('since', since);
	    me.lookup('content').setStyle('line-height', view.lineHeight + 'px');

	    view.loadTask = new Ext.util.DelayedTask(me.doLoad, me, [true, false]);

	    view.task = Ext.TaskManager.start({
		run: function() {
		    if (!view.isVisible() || !view.scrollToEnd || !viewmodel.get('livemode')) {
			return;
		    }

		    if (me.scrollPosBottom() <= 5) {
			view.loadTask.delay(200, undefined, undefined, [true, false]);
		    }
		},
		interval: 1000,
	    });
	},

	onLiveMode: function() {
	    let me = this;
	    let view = me.getView();
	    delete view.startcursor;
	    delete view.endcursor;
	    delete view.content;
	    me.getViewModel().set('livemode', true);
	    view.scrollToEnd = true;
	    me.updateView([], true, false);
	},

	onTimespan: function() {
	    let me = this;
	    me.getViewModel().set('livemode', false);
	    me.updateView([], false);
	},
    },

    onDestroy: function() {
	let me = this;
	me.loadTask.cancel();
	Ext.TaskManager.stop(me.task);
	delete me.content;
    },

    // for user to initiate a load from outside
    requestUpdate: function() {
	let me = this;
	me.loadTask.delay(200);
    },

    viewModel: {
	data: {
	    livemode: true,
	    until: null,
	    since: null,
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

	items: [
	    '->',
	    {
		xtype: 'segmentedbutton',
		items: [
		    {
			text: gettext('Live Mode'),
			bind: {
			    pressed: '{livemode}',
			},
			handler: 'onLiveMode',
		    },
		    {
			text: gettext('Select Timespan'),
			bind: {
			    pressed: '{!livemode}',
			},
			handler: 'onTimespan',
		    },
		],
	    },
	    {
		xtype: 'box',
		bind: { disabled: '{livemode}' },
		autoEl: { cn: gettext('Since') + ':' },
	    },
	    {
		xtype: 'datefield',
		name: 'since_date',
		reference: 'since',
		format: 'Y-m-d',
		bind: {
		    disabled: '{livemode}',
		    value: '{since}',
		    maxValue: '{until}',
		},
	    },
	    {
		xtype: 'box',
		bind: { disabled: '{livemode}' },
		autoEl: { cn: gettext('Until') + ':' },
	    },
	    {
		xtype: 'datefield',
		name: 'until_date',
		reference: 'until',
		format: 'Y-m-d',
		bind: {
		    disabled: '{livemode}',
		    value: '{until}',
		    minValue: '{since}',
		},
	    },
	    {
		xtype: 'button',
		text: 'Update',
		reference: 'updateBtn',
		handler: 'updateParams',
		bind: {
		    disabled: '{livemode}',
		},
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

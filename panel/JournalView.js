/*
 * Display log entries in a panel with scrollbar
 * The log entries are automatically refreshed via a background task,
 * with newest entries comming at the bottom
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
	    var me = this;
	    var viewModel = me.getViewModel();
	    var since = viewModel.get('since');
	    var until = viewModel.get('until');

	    since.setHours(0, 0, 0, 0);
	    until.setHours(0, 0, 0, 0);
	    until.setDate(until.getDate()+1);

	    me.getView().loadTask.delay(200, undefined, undefined, [
		false,
		false,
		Ext.Date.format(since, "U"),
		Ext.Date.format(until, "U")
	    ]);
	},

	scrollPosBottom: function() {
	    var view = this.getView();
	    var pos = view.getScrollY();
	    var maxPos = view.getScrollable().getMaxPosition().y;
	    return maxPos - pos;
	},

	scrollPosTop: function() {
	    var view = this.getView();
	    return view.getScrollY();
	},

	updateScroll: function(livemode, num, scrollPos, scrollPosTop) {
	    var me = this;
	    var view = me.getView();

	    if (!livemode) {
		setTimeout(function() { view.scrollTo(0, 0); }, 10);
	    } else if (view.scrollToEnd && scrollPos <= 0) {
		setTimeout(function() { view.scrollTo(0, Infinity); }, 10);
	    } else if (!view.scrollToEnd && scrollPosTop < 20*view.lineHeight) {
		setTimeout(function() { view.scrollTo(0, num*view.lineHeight + scrollPosTop); }, 10);
	    }
	},

	updateView: function(lines, livemode, top) {
	    var me = this;
	    var view = me.getView();
	    var viewmodel = me.getViewModel();
	    if (viewmodel.get('livemode') !== livemode) {
		return; // we switched mode, do not update the content
	    }
	    var contentEl = me.lookup('content');

	    // save old scrollpositions
	    var scrollPos = me.scrollPosBottom();
	    var scrollPosTop = me.scrollPosTop();

	    var newend = lines.shift();
	    var newstart = lines.pop();

	    var num = lines.length;
	    var text = lines.map(Ext.htmlEncode).join('<br>');

	    if (!livemode) {
		view.content = num ? text : 'no content';
	    } else {
		// update content
		if (top && num) {
		    view.content = view.content ? text + '<br>' + view.content : text;
		} else if (!top && num) {
		    view.content = view.content ? view.content + '<br>' + text : text;
		}

		// update cursors
		if (!top || !view.startcursor) {
		    view.startcursor = newstart;
		}

		if (top || !view.endcursor) {
		    view.endcursor = newend;
		}
	    }

	    contentEl.update(view.content);

	    me.updateScroll(livemode, num, scrollPos, scrollPosTop);
	},

	doLoad: function(livemode, top, since, until) {
	    var me = this;
	    if (me.running) {
		me.requested = true;
		return;
	    }
	    me.running = true;
	    var view = me.getView();
	    var params = {
		lastentries: view.numEntries || 500,
	    };
	    if (livemode) {
		if (!top && view.startcursor) {
		    params = {
			startcursor: view.startcursor
		    };
		} else if (view.endcursor) {
		    params.endcursor = view.endcursor;
		}
	    } else {
		params = {
		    since: since,
		    until: until
		};
	    }
	    Proxmox.Utils.API2Request({
		url: view.url,
		params: params,
		waitMsgTarget: (!livemode) ? view : undefined,
		method: 'GET',
		success: function(response) {
		    Proxmox.Utils.setErrorMask(me, false);
		    var lines = response.result.data;
		    me.updateView(lines, livemode, top);
		    me.running = false;
		    if (me.requested) {
			me.requested = false;
			view.loadTask.delay(200);
		    }
		},
		failure: function(response) {
		    var msg = response.htmlStatus;
		    Proxmox.Utils.setErrorMask(me, msg);
		    me.running = false;
		    if (me.requested) {
			me.requested = false;
			view.loadTask.delay(200);
		    }
		}
	    });
	},

	onScroll: function(x, y) {
	    var me = this;
	    var view = me.getView();
	    var viewmodel = me.getViewModel();
	    var livemode = viewmodel.get('livemode');
	    if (!livemode) {
		return;
	    }

	    if (me.scrollPosTop() < 20*view.lineHeight) {
		view.scrollToEnd = false;
		view.loadTask.delay(200, undefined, undefined, [true, true]);
	    } else if (me.scrollPosBottom() <= 1) {
		view.scrollToEnd = true;
	    }
	},

	init: function(view) {
	    var me = this;

	    if (!view.url) {
		throw "no url specified";
	    }

	    var viewmodel = me.getViewModel();
	    var viewModel = this.getViewModel();
	    var since = new Date();
	    since.setDate(since.getDate() - 3);
	    viewModel.set('until', new Date());
	    viewModel.set('since', since);
	    me.lookup('content').setStyle('line-height', view.lineHeight + 'px');

	    view.loadTask = new Ext.util.DelayedTask(me.doLoad, me, [true, false]);

	    me.updateParams();
	    view.task = Ext.TaskManager.start({
		run: function() {
		    if (!view.isVisible() || !view.scrollToEnd || !viewmodel.get('livemode')) {
			return;
		    }

		    if (me.scrollPosBottom() <= 1) {
			view.loadTask.delay(200, undefined, undefined, [true, false]);
		    }
		},
		interval: 1000
	    });
	},

	onLiveMode: function() {
	    var me = this;
	    var view = me.getView();
	    delete view.startcursor;
	    delete view.endcursor;
	    delete view.content;
	    me.getViewModel().set('livemode', true);
	    view.scrollToEnd = true;
	    me.updateView([], true, false);
	},

	onTimespan: function() {
	    var me = this;
	    me.getViewModel().set('livemode', false);
	    me.updateView([], false);
	}
    },

    onDestroy: function() {
	var me = this;
	me.loadTask.cancel();
	Ext.TaskManager.stop(me.task);
	delete me.content;
    },

    // for user to initiate a load from outside
    requestUpdate: function() {
	var me = this;
	me.loadTask.delay(200);
    },

    viewModel: {
	data: {
	    livemode: true,
	    until: null,
	    since: null
	}
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
		    var controller = this.component.getController();
		    if (controller) { // on destroy, controller can be gone
			controller.onScroll(x,y);
		    }
		},
		buffer: 200
	    },
	}
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
			    pressed: '{livemode}'
			},
			handler: 'onLiveMode',
		    },
		    {
			text: gettext('Select Timespan'),
			bind: {
			    pressed: '{!livemode}'
			},
			handler: 'onTimespan',
		    }
		]
	    },
	    {
		xtype: 'box',
		bind: { disabled: '{livemode}' },
		autoEl: { cn: gettext('Since') + ':' }
	    },
	    {
		xtype: 'datefield',
		name: 'since_date',
		reference: 'since',
		format: 'Y-m-d',
		bind: {
		    disabled: '{livemode}',
		    value: '{since}',
		    maxValue: '{until}'
		}
	    },
	    {
		xtype: 'box',
		bind: { disabled: '{livemode}' },
		autoEl: { cn: gettext('Until') + ':' }
	    },
	    {
		xtype: 'datefield',
		name: 'until_date',
		reference: 'until',
		format: 'Y-m-d',
		bind: {
		    disabled: '{livemode}',
		    value: '{until}',
		    minValue: '{since}'
		}
	    },
	    {
		xtype: 'button',
		text: 'Update',
		reference: 'updateBtn',
		handler: 'updateParams',
		bind: {
		    disabled: '{livemode}'
		}
	    }
	]
    },

    items: [
	{
	    xtype: 'box',
	    reference: 'content',
	    style: {
		font: 'normal 11px tahoma, arial, verdana, sans-serif',
		'white-space': 'pre'
	    },
	}
    ]
});

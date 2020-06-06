/*
 * Extends the Ext.data.Store type with  startUpdate() and stopUpdate() methods
 * to refresh the store data in the background.
 * Components using this store directly will flicker due to the redisplay of
 * the element ater 'config.interval' ms.
 *
 * Note that you have to set 'autoStart' or call startUpdate() once yourself
 * for the background load to begin.
 */
Ext.define('Proxmox.data.UpdateStore', {
    extend: 'Ext.data.Store',
    alias: 'store.update',

    config: {
	interval: 3000,

	isStopped: true,

	autoStart: false,
    },

    destroy: function() {
	let me = this;
	me.stopUpdate();
	me.callParent();
    },

    constructor: function(config) {
	let me = this;

	config = config || {};
	if (config.interval === undefined) {
	    delete config.interval;
	}

	if (!config.storeid) {
	    throw "no storeid specified";
	}

	let load_task = new Ext.util.DelayedTask();

	let run_load_task = function() {
	    if (me.getIsStopped()) {
		return;
	    }

	    if (Proxmox.Utils.authOK()) {
		let start = new Date();
		me.load(function() {
		    let runtime = new Date() - start;
		    let interval = me.getInterval() + runtime*2;
		    load_task.delay(interval, run_load_task);
		});
	    } else {
		load_task.delay(200, run_load_task);
	    }
	};

	Ext.apply(config, {
	    startUpdate: function() {
		me.setIsStopped(false);
		// run_load_task(); this makes problems with chrome
		load_task.delay(1, run_load_task);
	    },
	    stopUpdate: function() {
		me.setIsStopped(true);
		load_task.cancel();
	    },
	});

	me.callParent([config]);

	me.load_task = load_task;

	if (me.getAutoStart()) {
	    me.startUpdate();
	}
    },
});

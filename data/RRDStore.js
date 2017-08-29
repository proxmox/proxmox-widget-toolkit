/* Extends the Proxmox.data.UpdateStore type
 *
 *
 */
Ext.define('Proxmox.data.RRDStore', {
    extend: 'Proxmox.data.UpdateStore',
    alias: 'store.proxmoxRRDStore',

    setRRDUrl: function(timeframe, cf) {
	var me = this;
	if (!timeframe) {
	    timeframe = me.timeframe;
	}

	if (!cf) {
	    cf = me.cf;
	}

	me.proxy.url = me.rrdurl + "?timeframe=" + timeframe + "&cf=" + cf;
    },

    proxy: {
	type: 'proxmox'
    },

    timeframe: 'hour',

    cf: 'AVERAGE',

    constructor: function(config) {
	var me = this;

	config = config || {};

	// set default interval to 30seconds
	if (!config.interval) {
	    config.interval = 30000;
	}

	// set a new storeid
	if (!config.storeid) {
	    config.storeid = 'rrdstore-' + (++Ext.idSeed);
	}

	// rrdurl is required
	if (!config.rrdurl) {
	    throw "no rrdurl specified";
	}

	var stateid = 'proxmoxRRDTypeSelection';
	var sp = Ext.state.Manager.getProvider();
	var stateinit = sp.get(stateid);

        if (stateinit) {
	    if(stateinit.timeframe !== me.timeframe || stateinit.cf !== me.rrdcffn){
		me.timeframe = stateinit.timeframe;
		me.rrdcffn = stateinit.cf;
	    }
	}

	me.callParent([config]);

	me.setRRDUrl();
	me.mon(sp, 'statechange', function(prov, key, state){
	    if (key === stateid) {
		if (state && state.id) {
		    if (state.timeframe !== me.timeframe || state.cf !== me.cf) {
		        me.timeframe = state.timeframe;
		        me.cf = state.cf;
			me.setRRDUrl();
			me.reload();
		    }
		}
	    }
	});
    }
});

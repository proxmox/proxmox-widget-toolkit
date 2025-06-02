/* Extends the Proxmox.data.UpdateStore type
 *
 *
 */
Ext.define('Proxmox.data.RRDStore', {
    extend: 'Proxmox.data.UpdateStore',
    alias: 'store.proxmoxRRDStore',

    setRRDUrl: function (timeframe, cf) {
        let me = this;
        if (!timeframe) {
            timeframe = me.timeframe;
        }

        if (!cf) {
            cf = me.cf;
        }

        me.proxy.url = me.rrdurl + '?timeframe=' + timeframe + '&cf=' + cf;
    },

    proxy: {
        type: 'proxmox',
    },

    timeframe: 'hour',

    cf: 'AVERAGE',

    constructor: function (config) {
        let me = this;

        config = config || {};

        // set default interval to 30seconds
        if (!config.interval) {
            config.interval = 30000;
        }

        // rrdurl is required
        if (!config.rrdurl) {
            throw 'no rrdurl specified';
        }

        let stateid = 'proxmoxRRDTypeSelection';
        let sp = Ext.state.Manager.getProvider();
        let stateinit = sp.get(stateid);

        if (stateinit) {
            if (stateinit.timeframe !== me.timeframe || stateinit.cf !== me.rrdcffn) {
                me.timeframe = stateinit.timeframe;
                me.rrdcffn = stateinit.cf;
            }
        }

        me.callParent([config]);

        me.setRRDUrl();
        me.mon(sp, 'statechange', function (prov, key, state) {
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
    },
});

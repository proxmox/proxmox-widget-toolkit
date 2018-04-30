/* This store encapsulates data items which are organized as an Array of key-values Objects
 * ie data[0] contains something like {key: "keyboard", value: "da"}
*
* Designed to work with the KeyValue model and the JsonObject data reader
*/
Ext.define('Proxmox.data.ObjectStore',  {
    extend: 'Proxmox.data.UpdateStore',

    getRecord: function() {
	var me = this;
	var record = Ext.create('Ext.data.Model');
	me.getData().each(function(item) {
	    record.set(item.data.key, item.data.value);
	});
	record.commit(true);
	return record;
    },

    constructor: function(config) {
	var me = this;

        config = config || {};

	if (!config.storeid) {
	    config.storeid =  'proxmox-store-' + (++Ext.idSeed);
	}

        Ext.applyIf(config, {
	    model: 'KeyValue',
            proxy: {
                type: 'proxmox',
		url: config.url,
		extraParams: config.extraParams,
                reader: {
		    type: 'jsonobject',
		    rows: config.rows,
		    readArray: config.readArray,
		    rootProperty: config.root || 'data'
		}
            }
        });

        me.callParent([config]);
    }
});

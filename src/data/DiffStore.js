/*
 * The DiffStore is a in-memory store acting as proxy between a real store
 * instance and a component.
 * Its purpose is to redisplay the component *only* if the data has been changed
 * inside the real store, to avoid the annoying visual flickering of using
 * the real store directly.
 *
 * Implementation:
 * The DiffStore monitors via mon() the 'load' events sent by the real store.
 * On each 'load' event, the DiffStore compares its own content with the target
 * store (call to cond_add_item()) and then fires a 'refresh' event.
 * The 'refresh' event will automatically trigger a view refresh on the component
 * who binds to this store.
 */

/* Config properties:
 * rstore: the realstore which will autorefresh its content from the API
 * Only works if rstore has a model and use 'idProperty'
 * sortAfterUpdate: sort the diffstore before rendering the view
 */
Ext.define('Proxmox.data.DiffStore', {
    extend: 'Ext.data.Store',
    alias: 'store.diff',

    sortAfterUpdate: false,

    // if true, destroy rstore on destruction. Defaults to true if a rstore
    // config is passed instead of an existing rstore instance
    autoDestroyRstore: false,

    onDestroy: function() {
	let me = this;
	if (me.autoDestroyRstore) {
	    if (Ext.isFunction(me.rstore.destroy)) {
		me.rstore.destroy();
	    }
	    delete me.rstore;
	}
	me.callParent();
    },

    constructor: function(config) {
	let me = this;

	config = config || {};

	if (!config.rstore) {
	    throw "no rstore specified";
	}

	if (!config.rstore.model) {
	    throw "no rstore model specified";
	}

	let rstore;
	if (config.rstore.isInstance) {
	    rstore = config.rstore;
	} else if (config.rstore.type) {
	    Ext.applyIf(config.rstore, {
		autoDestroyRstore: true,
	    });
	    rstore = Ext.create(`store.${config.rstore.type}`, config.rstore);
	} else {
	    throw 'rstore is not an instance, and cannot autocreate without "type"';
	}

	Ext.apply(config, {
	    model: rstore.model,
	    proxy: { type: 'memory' },
	});

	me.callParent([config]);

	me.rstore = rstore;

	let first_load = true;

	let cond_add_item = function(data, id) {
	    let olditem = me.getById(id);
	    if (olditem) {
		olditem.beginEdit();
		Ext.Array.each(me.model.prototype.fields, function(field) {
		    if (olditem.data[field.name] !== data[field.name]) {
			olditem.set(field.name, data[field.name]);
		    }
		});
		olditem.endEdit(true);
		olditem.commit();
	    } else {
		let newrec = Ext.create(me.model, data);
		let pos = me.appendAtStart && !first_load ? 0 : me.data.length;
		me.insert(pos, newrec);
	    }
	};

	let loadFn = function(s, records, success) {
	    if (!success) {
		return;
	    }

	    me.suspendEvents();

	    // getSource returns null if data is not filtered
	    // if it is filtered it returns all records
	    let allItems = me.getData().getSource() || me.getData();

	    // remove vanished items
	    allItems.each(function(olditem) {
		let item = me.rstore.getById(olditem.getId());
		if (!item) {
		    me.remove(olditem);
		}
	    });

	    me.rstore.each(function(item) {
		cond_add_item(item.data, item.getId());
	    });

	    me.filter();

	    if (me.sortAfterUpdate) {
		me.sort();
	    }

	    first_load = false;

	    me.resumeEvents();
	    me.fireEvent('refresh', me);
	    me.fireEvent('datachanged', me);
	};

	if (me.rstore.isLoaded()) {
	    // if store is already loaded,
	    // insert items instantly
	    loadFn(me.rstore, [], true);
	}

	me.mon(me.rstore, 'load', loadFn);
    },
});

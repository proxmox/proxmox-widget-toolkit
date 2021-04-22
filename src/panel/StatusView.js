Ext.define('Proxmox.panel.StatusView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.pmxStatusView',

    layout: {
	type: 'column',
    },

    title: gettext('Status'),

    getRecordValue: function(key, store) {
	let me = this;

	if (!key) {
	    throw "no key given";
	}

	if (store === undefined) {
	    store = me.getStore();
	}

	let rec = store.getById(key);
	if (rec) {
	    return rec.data.value;
	}
	return '';
    },

    fieldRenderer: function(val, max) {
	if (max === undefined) {
	    return val;
	}

	if (!Ext.isNumeric(max) || max === 1) {
	    return Proxmox.Utils.render_usage(val);
	}
	return Proxmox.Utils.render_size_usage(val, max);
    },

    fieldCalculator: function(used, max) {
	if (!Ext.isNumeric(max) && Ext.isNumeric(used)) {
	    return used;
	} else if (!Ext.isNumeric(used)) {
	    /* we come here if the field is from a node
	     * where the records are not mem and maxmem
	     * but mem.used and mem.total
	     */
	    if (used.used !== undefined &&
		used.total !== undefined) {
		return used.used/used.total;
	    }
	}

	return used/max;
    },

    updateField: function(field) {
	let me = this;
	let renderer = me.fieldRenderer;
	if (Ext.isFunction(field.renderer)) {
	    renderer = field.renderer;
	}
	if (field.multiField === true) {
	    field.updateValue(renderer.call(field, me.getStore().getRecord()));
	} else if (field.textField !== undefined) {
	    field.updateValue(renderer.call(field, me.getRecordValue(field.textField)));
	} else if (field.valueField !== undefined) {
	    let used = me.getRecordValue(field.valueField);
	    let max = field.maxField !== undefined ? me.getRecordValue(field.maxField) : 1;

	    let calculate = me.fieldCalculator;
	    if (Ext.isFunction(field.calculate)) {
		calculate = field.calculate;
	    }
	    field.updateValue(renderer.call(field, used, max), calculate(used, max));
	}
    },

    getStore: function() {
	let me = this;

	if (!me.rstore) {
	    throw "there is no rstore";
	}

	return me.rstore;
    },

    updateTitle: function() {
	let me = this;
	me.setTitle(me.getRecordValue('name'));
    },

    updateValues: function(store, records, success) {
	let me = this;

	if (!success) {
	    return; // do not update if store load was not successful
	}

	me.query('pmxInfoWidget').forEach(me.updateField, me);

	me.updateTitle(store);
    },

    initComponent: function() {
	let me = this;

	if (!me.rstore) {
	    throw "no rstore given";
	}
	if (!me.title) {
	    throw "no title given";
	}

	Proxmox.Utils.monStoreErrors(me, me.rstore);

	me.callParent();

	me.mon(me.rstore, 'load', me.updateValues, me);
    },

});

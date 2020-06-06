Ext.define('Proxmox.grid.PendingObjectGrid', {
    extend: 'Proxmox.grid.ObjectGrid',
    alias: ['widget.proxmoxPendingObjectGrid'],

    getObjectValue: function(key, defaultValue, pending) {
	var me = this;
	var rec = me.store.getById(key);
	if (rec) {
	    var value = rec.data.value;
	    if (pending) {
		if (Ext.isDefined(rec.data.pending) && rec.data.pending !== '') {
		    value = rec.data.pending;
		} else if (rec.data.delete === 1) {
		    value = defaultValue;
		}
	    }

            if (Ext.isDefined(value) && value !== '') {
		return value;
            } else {
		return defaultValue;
            }
	}
	return defaultValue;
    },

    hasPendingChanges: function(key) {
	var me = this;
	var rows = me.rows;
	var rowdef = rows && rows[key] ? rows[key] : {};
	var keys = rowdef.multiKey || [key];
	var pending = false;

	Ext.Array.each(keys, function(k) {
	    var rec = me.store.getById(k);
	    if (rec && rec.data && (
		    Ext.isDefined(rec.data.pending) && rec.data.pending !== '' ||
		    rec.data.delete === 1
	    )) {
		pending = true;
		return false; // break
	    }
	});

	return pending;
    },

    renderValue: function(value, metaData, record, rowIndex, colIndex, store) {
	var me = this;
	var rows = me.rows;
	var key = record.data.key;
	var rowdef = rows && rows[key] ? rows[key] : {};
	var renderer = rowdef.renderer;
	var current = '';
	var pendingdelete = '';
	var pending = '';

	if (renderer) {
	    current = renderer(value, metaData, record, rowIndex, colIndex, store, false);
	    if (me.hasPendingChanges(key)) {
		pending = renderer(record.data.pending, metaData, record, rowIndex, colIndex, store, true);
	    }
	    if (pending == current) {
		pending = undefined;
	    }
	} else {
	    current = value || '';
	    pending = record.data.pending;
	}

	if (record.data.delete) {
	    var delete_all = true;
	    if (rowdef.multiKey) {
		Ext.Array.each(rowdef.multiKey, function(k) {
		    var rec = me.store.getById(k);
		    if (rec && rec.data && rec.data.delete !== 1) {
			delete_all = false;
			return false; // break
		    }
		});
	    }
	    if (delete_all) {
		pending = '<div style="text-decoration: line-through;">'+ current +'</div>';
	    }
	}

	if (pending) {
	    return current + '<div style="color:darkorange">' + pending + '</div>';
	} else {
	    return current;
	}
    },

    initComponent: function() {
	var me = this;

	var rows = me.rows;

	if (!me.rstore) {
	    if (!me.url) {
		throw "no url specified";
	    }

	    me.rstore = Ext.create('Proxmox.data.ObjectStore', {
		model: 'KeyValuePendingDelete',
		readArray: true,
		url: me.url,
		interval: me.interval,
		extraParams: me.extraParams,
		rows: me.rows,
	    });
	}

	me.callParent();
   },
});

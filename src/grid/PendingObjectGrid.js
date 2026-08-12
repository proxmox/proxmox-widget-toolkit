/** Renders a list of key-value objects where a value can have a not yet applied, pending change

Takes the same `rows` configuration as `Proxmox.grid.ObjectGrid`, but renders the currently active
value together with the pending one below it, and strikes through values that are pending deletion.

A `renderer` gets a boolean, indicating if the value to be rendered is the pending one (or the
current one if 'false'), passed as an additional last argument, so that it can resolve related keys,
like those listed in `multiKey`, for the correct state.

The same value escaping rules as for `Proxmox.grid.ObjectGrid` apply, see the doc-comment there.

*/
Ext.define('Proxmox.grid.PendingObjectGrid', {
    extend: 'Proxmox.grid.ObjectGrid',
    alias: ['widget.proxmoxPendingObjectGrid'],

    getObjectValue: function (key, defaultValue, pending) {
        let me = this;
        let rec = me.store.getById(key);
        if (rec) {
            let value = rec.data.value;
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

    hasPendingChanges: function (key) {
        let me = this;
        let rows = me.rows;
        let rowdef = rows && rows[key] ? rows[key] : {};
        let keys = rowdef.multiKey || [key];
        let pending = false;

        Ext.Array.each(keys, function (k) {
            let rec = me.store.getById(k);
            if (
                rec &&
                rec.data &&
                ((Ext.isDefined(rec.data.pending) && rec.data.pending !== '') ||
                    rec.data.delete === 1)
            ) {
                pending = true;
                return false; // break
            }
            return true;
        });

        return pending;
    },

    renderValue: function (value, metaData, record, rowIndex, colIndex, store) {
        let me = this;
        let rows = me.rows;
        let key = record.data.key;
        let rowdef = rows && rows[key] ? rows[key] : {};
        let renderer = rowdef.renderer;
        let current = '';
        let pending = '';

        if (renderer) {
            current = renderer(value, metaData, record, rowIndex, colIndex, store, false);
            if (me.hasPendingChanges(key)) {
                pending = renderer(
                    record.data.pending,
                    metaData,
                    record,
                    rowIndex,
                    colIndex,
                    store,
                    true,
                );
            }
            if (pending === current) {
                pending = undefined;
            }
        } else {
            // without a renderer the raw values end up in the DOM as HTML, so encode them here.
            // renderer output is not encoded, as renderers are expected to return HTML.
            current = Ext.htmlEncode(value ?? '');
            pending = Ext.htmlEncode(record.data.pending);
        }

        if (record.data.delete) {
            let delete_all = true;
            if (rowdef.multiKey) {
                Ext.Array.each(rowdef.multiKey, function (k) {
                    let rec = me.store.getById(k);
                    if (rec && rec.data && rec.data.delete !== 1) {
                        delete_all = false;
                        return false; // break
                    }
                    return true;
                });
            }
            if (delete_all) {
                pending = '<div style="text-decoration: line-through;">' + current + '</div>';
            }
        }

        if (pending) {
            return current + '<div style="color:darkorange">' + pending + '</div>';
        } else {
            return current;
        }
    },

    initComponent: function () {
        let me = this;

        if (!me.rstore) {
            if (!me.url) {
                throw 'no url specified';
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

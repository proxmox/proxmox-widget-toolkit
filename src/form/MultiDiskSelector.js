Ext.define('Proxmox.form.MultiDiskSelector', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pmxMultiDiskSelector',

    mixins: {
        field: 'Ext.form.field.Field',
    },

    selModel: 'checkboxmodel',

    store: {
        data: [],
        proxy: {
            type: 'proxmox',
        },
    },

    // which field of the disklist is used for getValue
    valueField: 'devpath',

    // which parameter is used for the type
    typeParameter: 'type',

    // the type of disks to show
    diskType: 'unused',

    // add include-partitions=1 as a request parameter
    includePartitions: false,

    disks: [],

    allowBlank: false,

    getValue: function () {
        let me = this;
        return me.disks;
    },

    setValue: function (value) {
        let me = this;

        value ??= [];

        if (!Ext.isArray(value)) {
            value = value.split(/;, /);
        }

        let store = me.getStore();
        let selection = [];

        let keyField = me.valueField;

        value.forEach((item) => {
            let rec = store.findRecord(keyField, item, 0, false, true, true);
            if (rec) {
                selection.push(rec);
            }
        });

        me.setSelection(selection);

        return me.mixins.field.setValue.call(me, value);
    },

    getErrors: function (value) {
        let me = this;
        if (me.allowBlank === false && me.getSelectionModel().getCount() === 0) {
            me.addBodyCls(['x-form-trigger-wrap-default', 'x-form-trigger-wrap-invalid']);
            return [gettext('No Disk selected')];
        }

        me.removeBodyCls(['x-form-trigger-wrap-default', 'x-form-trigger-wrap-invalid']);
        return [];
    },

    update_disklist: function () {
        var me = this;
        var disks = me.getSelection();

        var val = [];
        disks.sort(function (a, b) {
            var aorder = a.get('order') || 0;
            var border = b.get('order') || 0;
            return aorder - border;
        });

        disks.forEach(function (disk) {
            val.push(disk.get(me.valueField));
        });

        me.validate();
        me.disks = val;
    },

    columns: [
        {
            text: gettext('Device'),
            dataIndex: 'devpath',
            flex: 2,
        },
        {
            text: gettext('Model'),
            dataIndex: 'model',
            flex: 2,
        },
        {
            text: gettext('Serial'),
            dataIndex: 'serial',
            flex: 2,
        },
        {
            text: gettext('Size'),
            dataIndex: 'size',
            renderer: Proxmox.Utils.format_size,
            flex: 1,
        },
        {
            header: gettext('Order'),
            xtype: 'widgetcolumn',
            dataIndex: 'order',
            sortable: true,
            flex: 1,
            widget: {
                xtype: 'proxmoxintegerfield',
                minValue: 1,
                isFormField: false,
                listeners: {
                    change: function (numberfield, value, old_value) {
                        let grid = this.up('pmxMultiDiskSelector');
                        var record = numberfield.getWidgetRecord();
                        record.set('order', value);
                        grid.update_disklist(record);
                    },
                },
            },
        },
    ],

    listeners: {
        selectionchange: function () {
            this.update_disklist();
        },
    },

    initComponent: function () {
        let me = this;

        let extraParams = {};

        if (!me.url) {
            if (!me.nodename) {
                throw 'no url or nodename given';
            }

            me.url = `/api2/json/nodes/${me.nodename}/disks/list`;

            extraParams[me.typeParameter] = me.diskType;

            if (me.includePartitions) {
                extraParams['include-partitions'] = 1;
            }
        }

        me.disks = [];

        me.callParent();
        let store = me.getStore();
        store.setProxy({
            type: 'proxmox',
            url: me.url,
            extraParams,
        });
        store.load();
        store.sort({ property: me.valueField });
    },
});

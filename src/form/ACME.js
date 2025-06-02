Ext.define('Proxmox.form.ACMEApiSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.pmxACMEApiSelector',

    fieldLabel: gettext('DNS API'),
    displayField: 'name',
    valueField: 'id',

    store: {
        model: 'proxmox-acme-challenges',
        autoLoad: true,
    },

    triggerAction: 'all',
    queryMode: 'local',
    allowBlank: false,
    editable: true,
    forceSelection: true,
    anyMatch: true,
    selectOnFocus: true,

    getSchema: function () {
        let me = this;
        let val = me.getValue();
        if (val) {
            let record = me.getStore().findRecord('id', val, 0, false, true, true);
            if (record) {
                return record.data.schema;
            }
        }
        return {};
    },

    initComponent: function () {
        let me = this;

        if (!me.url) {
            throw 'no url given';
        }

        me.callParent();
        me.getStore().getProxy().setUrl(me.url);
    },
});

Ext.define('Proxmox.form.ACMEAccountSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.pmxACMEAccountSelector',

    displayField: 'name',
    valueField: 'name',

    store: {
        model: 'proxmox-acme-accounts',
        autoLoad: true,
    },

    triggerAction: 'all',
    queryMode: 'local',
    allowBlank: false,
    editable: false,
    forceSelection: true,

    isEmpty: function () {
        return this.getStore().getData().length === 0;
    },

    initComponent: function () {
        let me = this;

        if (!me.url) {
            throw 'no url given';
        }

        me.callParent();
        me.getStore().getProxy().setUrl(me.url);
    },
});

Ext.define('Proxmox.form.ACMEPluginSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.pmxACMEPluginSelector',

    fieldLabel: gettext('Plugin'),
    displayField: 'plugin',
    valueField: 'plugin',

    store: {
        model: 'proxmox-acme-plugins',
        autoLoad: true,
        filters: (item) => item.data.type === 'dns',
    },

    triggerAction: 'all',
    queryMode: 'local',
    allowBlank: false,
    editable: false,

    initComponent: function () {
        let me = this;

        if (!me.url) {
            throw 'no url given';
        }

        me.callParent();
        me.getStore().getProxy().setUrl(me.url);
    },
});

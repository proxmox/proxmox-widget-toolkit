Ext.define('Proxmox.panel.PruneInputPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxPruneInputPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    // set on use for now
    //onlineHelp: 'maintenance_pruning',

    keepLastEmptyText: '',

    cbindData: function () {
        let me = this;
        me.isCreate = !!me.isCreate;
        return {};
    },

    column1: [
        {
            xtype: 'pmxPruneKeepField',
            name: 'keep-last',
            fieldLabel: gettext('Keep Last'),
            cbind: {
                deleteEmpty: '{!isCreate}',
                emptyText: '{keepLastEmptyText}',
            },
        },
        {
            xtype: 'pmxPruneKeepField',
            name: 'keep-daily',
            fieldLabel: gettext('Keep Daily'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
        {
            xtype: 'pmxPruneKeepField',
            name: 'keep-monthly',
            fieldLabel: gettext('Keep Monthly'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
    ],
    column2: [
        {
            xtype: 'pmxPruneKeepField',
            fieldLabel: gettext('Keep Hourly'),
            name: 'keep-hourly',
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
        {
            xtype: 'pmxPruneKeepField',
            name: 'keep-weekly',
            fieldLabel: gettext('Keep Weekly'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
        {
            xtype: 'pmxPruneKeepField',
            name: 'keep-yearly',
            fieldLabel: gettext('Keep Yearly'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
    ],
});

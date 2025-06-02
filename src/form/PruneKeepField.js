Ext.define('Proxmox.form.field.PruneKeep', {
    extend: 'Proxmox.form.field.Integer',
    xtype: 'pmxPruneKeepField',

    allowBlank: true,
    minValue: 1,

    listeners: {
        dirtychange: (field, dirty) => field.triggers.clear.setVisible(dirty),
    },
    triggers: {
        clear: {
            cls: 'pmx-clear-trigger',
            weight: -1,
            hidden: true,
            handler: function () {
                this.triggers.clear.setVisible(false);
                this.setValue(this.originalValue);
            },
        },
    },
});

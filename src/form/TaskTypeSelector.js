Ext.define('Proxmox.form.TaskTypeSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.pmxTaskTypeSelector',

    anyMatch: true,

    initComponent: function () {
        let me = this;
        me.store = Object.keys(Proxmox.Utils.task_desc_table).sort();
        me.callParent();
    },
    listeners: {
        change: function (field, newValue, oldValue) {
            if (newValue !== this.originalValue) {
                this.triggers.clear.setVisible(true);
            }
        },
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

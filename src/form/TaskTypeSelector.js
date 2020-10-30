Ext.define('Proxmox.form.TaskTypeSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.pmxTaskTypeSelector',

    anyMatch: true,

    initComponent: function() {
	let me = this;
	me.store = Object.keys(Proxmox.Utils.task_desc_table).sort();
	me.callParent();
    },
});

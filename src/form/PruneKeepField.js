Ext.define('Proxmox.form.field.PruneKeep', {
    extend: 'Proxmox.form.field.Integer',
    xtype: 'pmxPruneKeepField',

    allowBlank: true,
    minValue: 1,

    listeners: {
	change: function(field, newValue, oldValue) {
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
	    handler: function() {
		this.triggers.clear.setVisible(false);
		this.setValue(this.originalValue);
	    },
	},
    },

});

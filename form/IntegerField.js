Ext.define('Proxmox.form.field.Integer', {
    extend: 'Ext.form.field.Number',
    alias: 'widget.proxmoxintegerfield',

    config: {
	deleteEmpty: false,
    },

    allowDecimals: false,
    allowExponential: false,
    step: 1,

   getSubmitData: function() {
        var me = this,
            data = null,
            val;
        if (!me.disabled && me.submitValue && !me.isFileUpload()) {
            val = me.getSubmitValue();
            if (val !== undefined && val !== null && val !== '') {
                data = {};
                data[me.getName()] = val;
            } else if (me.getDeleteEmpty()) {
		data = {};
                data.delete = me.getName();
	    }
        }
        return data;
    },

});

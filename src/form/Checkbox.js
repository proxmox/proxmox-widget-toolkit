Ext.define('Proxmox.form.Checkbox', {
    extend: 'Ext.form.field.Checkbox',
    alias: ['widget.proxmoxcheckbox'],

    config: {
	defaultValue: undefined,
	deleteDefaultValue: false,
	deleteEmpty: false,
	clearOnDisable: false,
    },

    inputValue: '1',

    getSubmitData: function() {
        let me = this,
            data = null,
            val;
        if (!me.disabled && me.submitValue) {
            val = me.getSubmitValue();
            if (val !== null) {
                data = {};
		if (val === me.getDefaultValue() && me.getDeleteDefaultValue()) {
		    data.delete = me.getName();
		} else {
                    data[me.getName()] = val;
		}
            } else if (me.getDeleteEmpty()) {
               data = {};
               data.delete = me.getName();
	    }
        }
        return data;
    },

    setDisabled: function(disabled) {
	let me = this;

	// only clear on actual transition
	let toClearValue = me.clearOnDisable && !me.disabled && disabled;

	me.callParent(arguments);

	if (toClearValue) {
	    me.setValue(false); // TODO: could support other "reset value" or use originalValue?
	}
    },

    // also accept integer 1 as true
    setRawValue: function(value) {
	let me = this;

	if (value === 1) {
            me.callParent([true]);
	} else {
            me.callParent([value]);
	}
    },

});

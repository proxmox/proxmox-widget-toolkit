Ext.define('Proxmox.DateTimeField', {
    extend: 'Ext.form.FieldContainer',
    // FIXME: remove once all use sites upgraded (with versioned depends on new WTK!)
    alias: ['widget.promxoxDateTimeField']
    xtype: 'proxmoxDateTimeField',

    layout: 'hbox',

    referenceHolder: true,

    config: {
	submitFormat: 'U',
	disabled: false,
    },

    setValue: function(value) {
	let me = this;
	me.setDate(value);
	me.setTime(value);

	// Notify all 'value' bindings of state change
	me.publishState('value', value);
    },

    getValue: function() {
	let me = this;
	let date = me.lookupReference('dateentry').getValue();

	if (date === undefined || date === null) { return null; }

	let time = me.lookupReference('timeentry').getValue();

	if (time === undefined || time === null) { return null; }

	date.setHours(time.getHours());
	date.setMinutes(time.getMinutes());
	date.setSeconds(time.getSeconds());
	return date;
    },

    getSubmitValue: function() {
        let me = this;
        let format = me.submitFormat;
        let value = me.getValue();

        return value ? Ext.Date.format(value, format) : null;
    },

    setDate: function(date) {
	let me = this;
	let dateEntry = me.lookupReference('dateentry');
	dateEntry.setValue(date);
	dateEntry.publishState('value', date);
    },

    setTime: function(time) {
	let me = this;
	let timeEntry = me.lookupReference('timeentry');
	timeEntry.setValue(time);
	timeEntry.publishState('value', time);
    },

    items: [
	{
	    xtype: 'datefield',
	    editable: false,
	    reference: 'dateentry',
	    flex: 1,
	    format: 'Y-m-d',
	    bind: {
		disabled: '{disabled}',
	    },
	    listeners: {
		'change': function(field, newValue, oldValue) {
		    let dateTimeField = field.up('fieldcontainer');
		    dateTimeField.setDate(newValue);
		    let value = dateTimeField.getValue();
		    dateTimeField.publishState('value', value);
		},
	    },
	},
	{
	    xtype: 'timefield',
	    reference: 'timeentry',
	    format: 'H:i',
	    width: 80,
	    value: '00:00',
	    increment: 60,
	    bind: {
		disabled: '{disabled}',
	    },
	    listeners: {
		'change': function(field, newValue, oldValue) {
		    let dateTimeField = field.up('fieldcontainer');
		    dateTimeField.setTime(newValue);
		    let value = dateTimeField.getValue();
		    dateTimeField.publishState('value', value);
		},
	    },
	},
    ],

    setMinValue: function(value) {
	let me = this;
	let current = me.getValue();
	if (!value || !current) {
	    return;
	}

	// Clone to avoid modifying the referenced value
	let clone = new Date(value);
	let minhours = clone.getHours();
	let minminutes = clone.getMinutes();

	let hours = current.getHours();
	let minutes = current.getMinutes();

	clone.setHours(0);
	clone.setMinutes(0);
	clone.setSeconds(0);
	current.setHours(0);
	current.setMinutes(0);
	current.setSeconds(0);

	let time = new Date();
	if (current-clone > 0) {
	    time.setHours(0);
	    time.setMinutes(0);
	    time.setSeconds(0);
	    time.setMilliseconds(0);
	} else {
	    time.setHours(minhours);
	    time.setMinutes(minminutes);
	}
	me.lookup('timeentry').setMinValue(time);

	// current time is smaller than the time part of the new minimum
	// so we have to add 1 to the day
	if (minhours*60+minminutes > hours*60+minutes) {
	    clone.setDate(clone.getDate()+1);
	}
	me.lookup('dateentry').setMinValue(clone);
    },

    setMaxValue: function(value) {
	let me = this;
	let current = me.getValue();
	if (!value || !current) {
	    return;
	}

	// Clone to avoid modifying the referenced value
	let clone = new Date(value);
	let maxhours = clone.getHours();
	let maxminutes = clone.getMinutes();

	let hours = current.getHours();
	let minutes = current.getMinutes();

	clone.setHours(0);
	clone.setMinutes(0);
	clone.setSeconds(0);
	clone.setMilliseconds(0);
	current.setHours(0);
	current.setMinutes(0);
	current.setSeconds(0);
	current.setMilliseconds(0);

	let time = new Date();
	if (clone-current > 0) {
	    time.setHours(23);
	    time.setMinutes(59);
	    time.setSeconds(59);
	} else {
	    time.setHours(maxhours);
	    time.setMinutes(maxminutes);
	}
	me.lookup('timeentry').setMaxValue(time);

	// current time is bigger than the time part of the new maximum
	// so we have to subtract 1 to the day
	if (maxhours*60+maxminutes < hours*60+minutes) {
	    clone.setDate(clone.getDate()-1);
	}

	me.lookup('dateentry').setMaxValue(clone);
    },

    initComponent: function() {
	let me = this;

	me.callParent();

	let value = me.value || new Date();

	me.lookupReference('dateentry').setValue(value);
	me.lookupReference('timeentry').setValue(value);

	if (me.minValue) {
	    me.setMinValue(me.minValue);
	}

	if (me.maxValue) {
	    me.setMaxValue(me.maxValue);
	}

	me.relayEvents(me.lookupReference('dateentry'), ['change']);
	me.relayEvents(me.lookupReference('timeentry'), ['change']);
    },
});

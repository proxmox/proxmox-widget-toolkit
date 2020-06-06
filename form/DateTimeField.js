Ext.define('Proxmox.DateTimeField', {
    extend: 'Ext.form.FieldContainer',
    xtype: 'promxoxDateTimeField',

    layout: 'hbox',

    referenceHolder: true,

    submitFormat: 'U',

    getValue: function() {
	let me = this;
	let d = me.lookupReference('dateentry').getValue();

	if (d === undefined || d === null) { return null; }

	let t = me.lookupReference('timeentry').getValue();

	if (t === undefined || t === null) { return null; }

	let offset = (t.getHours() * 3600 + t.getMinutes() * 60) * 1000;

	return new Date(d.getTime() + offset);
    },

    getSubmitValue: function() {
        let me = this;
        let format = me.submitFormat;
        let value = me.getValue();

        return value ? Ext.Date.format(value, format) : null;
    },

    items: [
	{
	    xtype: 'datefield',
	    editable: false,
	    reference: 'dateentry',
	    flex: 1,
	    format: 'Y-m-d',
	},
	{
	    xtype: 'timefield',
	    reference: 'timeentry',
	    format: 'H:i',
	    width: 80,
	    value: '00:00',
	    increment: 60,
	},
    ],

    setMinValue: function(value) {
	let me = this;
	let current = me.getValue();
	if (!value || !current) {
	    return;
	}

	let minhours = value.getHours();
	let minminutes = value.getMinutes();

	let hours = current.getHours();
	let minutes = current.getMinutes();

	value.setHours(0);
	value.setMinutes(0);
	value.setSeconds(0);
	current.setHours(0);
	current.setMinutes(0);
	current.setSeconds(0);

	let time = new Date();
	if (current-value > 0) {
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
	    value.setDate(value.getDate()+1);
	}
	me.lookup('dateentry').setMinValue(value);
    },

    setMaxValue: function(value) {
	let me = this;
	let current = me.getValue();
	if (!value || !current) {
	    return;
	}

	let maxhours = value.getHours();
	let maxminutes = value.getMinutes();

	let hours = current.getHours();
	let minutes = current.getMinutes();

	value.setHours(0);
	value.setMinutes(0);
	current.setHours(0);
	current.setMinutes(0);

	let time = new Date();
	if (value-current > 0) {
	    time.setHours(23);
	    time.setMinutes(59);
	    time.setSeconds(59);
	} else {
	    time.setHours(maxhours);
	    time.setMinutes(maxminutes);
	}
	me.lookup('timeentry').setMaxValue(time);

	// current time is biger than the time part of the new maximum
	// so we have to subtract 1 to the day
	if (maxhours*60+maxminutes < hours*60+minutes) {
	    value.setDate(value.getDate()-1);
	}

	me.lookup('dateentry').setMaxValue(value);
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

Ext.define('Proxmox.DateTimeField', {
    extend: 'Ext.form.FieldContainer',
    // FIXME: remove once all use sites upgraded (with versioned depends on new WTK!)
    alias: ['widget.promxoxDateTimeField'],
    xtype: 'proxmoxDateTimeField',

    layout: 'hbox',

    viewModel: {
	data: {
	    datetime: null,
	    minDatetime: null,
	    maxDatetime: null,
	},

	formulas: {
	    date: {
		get: function(get) {
		    return get('datetime');
		},
		set: function(date) {
		    if (!date) {
			this.set('datetime', null);
			return;
		    }
		    let datetime = new Date(this.get('datetime'));
		    datetime.setDate(date.getDate());
		    datetime.setMonth(date.getMonth());
		    datetime.setFullYear(date.getFullYear());
		    this.set('datetime', datetime);
		},
	    },

	    time: {
		get: function(get) {
		    return get('datetime');
		},
		set: function(time) {
		    if (!time) {
			this.set('datetime', null);
			return;
		    }
		    let datetime = new Date(this.get('datetime'));
		    datetime.setHours(time.getHours());
		    datetime.setMinutes(time.getMinutes());
		    datetime.setSeconds(time.getSeconds());
		    datetime.setMilliseconds(time.getMilliseconds());
		    this.set('datetime', datetime);
		},
	    },

	    minDate: {
		get: function(get) {
		    let datetime = get('minDatetime');
		    return datetime ? new Date(datetime) : null;
		},
	    },

	    maxDate: {
		get: function(get) {
		    let datetime = get('maxDatetime');
		    return datetime ? new Date(datetime) : null;
		},
	    },

	    minTime: {
		get: function(get) {
		    let current = get('datetime');
		    let min = get('minDatetime');
		    if (min && current && !this.isSameDay(current, min)) {
			return new Date(min).setHours('00', '00', '00', '000');
		    }
		    return min;
		},
	    },

	    maxTime: {
		get: function(get) {
		    let current = get('datetime');
		    let max = get('maxDatetime');
		    if (max && current && !this.isSameDay(current, max)) {
			return new Date(max).setHours('23', '59', '59', '999');
		    }
		    return max;
		},
	    },
	},

	// Helper function to check if dates are the same day of the year
	isSameDay: function(date1, date2) {
	    return date1.getDate() === date2.getDate() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getFullYear() === date2.getFullYear();
	},
    },

    config: {
	value: null,
	submitFormat: 'U',
	disabled: false,
    },

    setValue: function(value) {
	this.getViewModel().set('datetime', value);
    },

    getValue: function() {
	return this.getViewModel().get('datetime');
    },

    getSubmitValue: function() {
	let me = this;
	let value = me.getValue();
	return value ? Ext.Date.format(value, me.submitFormat) : null;
    },

    setMinValue: function(value) {
	this.getViewModel().set('minDatetime', value);
    },

    getMinValue: function() {
	return this.getViewModel().get('minDatetime');
    },

    setMaxValue: function(value) {
	this.getViewModel().set('maxDatetime', value);
    },

    getMaxValue: function() {
	return this.getViewModel().get('maxDatetime');
    },

    initComponent: function() {
	let me = this;
	me.callParent();

	let vm = me.getViewModel();
	vm.set('datetime', me.config.value);
	// Propagate state change to binding
	vm.bind('{datetime}', function(value) {
	    me.publishState('value', value);
	    me.fireEvent('change', value);
	});
    },

    items: [
	{
	    xtype: 'datefield',
	    editable: false,
	    flex: 1,
	    format: 'Y-m-d',
	    bind: {
		value: '{date}',
		minValue: '{minDate}',
		maxValue: '{maxDate}',
	    },
	},
	{
	    xtype: 'timefield',
	    format: 'H:i',
	    width: 80,
	    value: '00:00',
	    increment: 60,
	    bind: {
		value: '{time}',
		minValue: '{minTime}',
		maxValue: '{maxTime}',
	    },
	},
    ],
});

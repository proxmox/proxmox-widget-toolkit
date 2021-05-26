Ext.define('Proxmox.chart.axis.segmenter.NumericBase2', {
    extend: 'Ext.chart.axis.segmenter.Numeric',
    alias: 'segmenter.numericBase2',

    // derived from the original numeric segmenter but using 2 instead of 10 as base
    preferredStep: function(min, estStepSize) {
	// Getting an order of magnitude of the estStepSize with a common logarithm.
	let order = Math.floor(Math.log2(estStepSize));
	let scale = Math.pow(2, order);

	estStepSize /= scale;

	// FIXME: below is not useful when using base 2 instead of base 10, we could
	// just directly set estStepSize to 2
	if (estStepSize <= 1) {
	    estStepSize = 1;
	} else if (estStepSize < 2) {
	    estStepSize = 2;
	}
	return {
	    unit: {
		// When passed estStepSize is less than 1, its order of magnitude
		// is equal to -number_of_leading_zeros in the estStepSize.
		fixes: -order, // Number of fractional digits.
		scale: scale,
	    },
	    step: estStepSize,
	};
    },

    /**
     * Wraps the provided estimated step size of a range without altering it into a step size object.
     *
     * @param {*} min The start point of range.
     * @param {*} estStepSize The estimated step size.
     * @return {Object} Return the step size by an object of step x unit.
     * @return {Number} return.step The step count of units.
     * @return {Object} return.unit The unit.
     */
    // derived from the original numeric segmenter but using 2 instead of 10 as base
    exactStep: function(min, estStepSize) {
	let order = Math.floor(Math.log2(estStepSize));
	let scale = Math.pow(2, order);

	return {
	    unit: {
		// add one decimal point if estStepSize is not a multiple of scale
		fixes: -order + (estStepSize % scale === 0 ? 0 : 1),
		scale: 1,
	    },
	    step: estStepSize,
	};
    },
});

Ext.define('Proxmox.widget.RRDChart', {
    extend: 'Ext.chart.CartesianChart',
    alias: 'widget.proxmoxRRDChart',

    unit: undefined, // bytes, bytespersecond, percent

    powerOfTwo: false,

    // set to empty string to suppress warning in debug mode
    downloadServerUrl: '-',

    controller: {
	xclass: 'Ext.app.ViewController',

	init: function(view) {
	    this.powerOfTwo = view.powerOfTwo;
	},

	convertToUnits: function(value) {
	    let units = ['', 'k', 'M', 'G', 'T', 'P'];
	    let si = 0;
	    let format = '0.##';
	    if (value < 0.1) format += '#';
	    const baseValue = this.powerOfTwo ? 1024 : 1000;
	    while (value >= baseValue && si < units.length -1) {
		value = value / baseValue;
		si++;
	    }

	    // javascript floating point weirdness
	    value = Ext.Number.correctFloat(value);

	    // limit decimal points
	    value = Ext.util.Format.number(value, format);

	    let unit = units[si];
	    if (this.powerOfTwo) unit += 'i';

	    return `${value.toString()} ${unit}`;
	},

	leftAxisRenderer: function(axis, label, layoutContext) {
	    let me = this;
	    return me.convertToUnits(label);
	},

	onSeriesTooltipRender: function(tooltip, record, item) {
	    let view = this.getView();

	    let suffix = '';
	    if (view.unit === 'percent') {
		suffix = '%';
	    } else if (view.unit === 'bytes') {
		suffix = 'B';
	    } else if (view.unit === 'bytespersecond') {
		suffix = 'B/s';
	    }

	    let prefix = item.field;
	    if (view.fieldTitles && view.fieldTitles[view.fields.indexOf(item.field)]) {
		prefix = view.fieldTitles[view.fields.indexOf(item.field)];
	    }
	    let v = this.convertToUnits(record.get(item.field));
	    let t = new Date(record.get('time'));
	    tooltip.setHtml(`${prefix}: ${v}${suffix}<br>${t}`);
	},

	onAfterAnimation: function(chart, eopts) {
	    // if the undo button is disabled, disable our tool
	    let ourUndoZoomButton = chart.header.tools[0];
	    let undoButton = chart.interactions[0].getUndoButton();
	    ourUndoZoomButton.setDisabled(undoButton.isDisabled());
	},
    },

    width: 770,
    height: 300,
    animation: false,
    interactions: [
	{
	    type: 'crosszoom',
	},
    ],
    legend: {
	padding: 0,
    },
    listeners: {
	animationend: 'onAfterAnimation',
    },

    constructor: function(config) {
	let me = this;

	let segmenter = config.powerOfTwo ? 'numericBase2' : 'numeric';
	config.axes = [
	    {
		type: 'numeric',
		position: 'left',
		grid: true,
		renderer: 'leftAxisRenderer',
		minimum: 0,
		segmenter,
	    },
	    {
		type: 'time',
		position: 'bottom',
		grid: true,
		fields: ['time'],
	    },
	];
	me.callParent([config]);
    },

    initComponent: function() {
	let me = this;

	if (!me.store) {
	    throw "cannot work without store";
	}

	if (!me.fields) {
	    throw "cannot work without fields";
	}

	me.callParent();

	// add correct label for left axis
	let axisTitle = "";
	if (me.unit === 'percent') {
	    axisTitle = "%";
	} else if (me.unit === 'bytes') {
	    axisTitle = "Bytes";
	} else if (me.unit === 'bytespersecond') {
	    axisTitle = "Bytes/s";
	} else if (me.fieldTitles && me.fieldTitles.length === 1) {
	    axisTitle = me.fieldTitles[0];
	} else if (me.fields.length === 1) {
	    axisTitle = me.fields[0];
	}

	me.axes[0].setTitle(axisTitle);

	me.updateHeader();

	if (me.header && me.legend) {
	    me.header.padding = '4 9 4';
	    me.header.add(me.legend);
	}

	if (!me.noTool) {
	    me.addTool({
		type: 'minus',
		disabled: true,
		tooltip: gettext('Undo Zoom'),
		handler: function() {
		    let undoButton = me.interactions[0].getUndoButton();
		    if (undoButton.handler) {
			undoButton.handler();
		    }
		},
	    });
	}

	// add a series for each field we get
	me.fields.forEach(function(item, index) {
	    let title = item;
	    if (me.fieldTitles && me.fieldTitles[index]) {
		title = me.fieldTitles[index];
	    }
	    me.addSeries(Ext.apply(
		{
		    type: 'line',
		    xField: 'time',
		    yField: item,
		    title: title,
		    fill: true,
		    style: {
			lineWidth: 1.5,
			opacity: 0.60,
		    },
		    marker: {
			opacity: 0,
			scaling: 0.01,
			fx: {
			    duration: 200,
			    easing: 'easeOut',
			},
		    },
		    highlightCfg: {
			opacity: 1,
			scaling: 1.5,
		    },
		    tooltip: {
			trackMouse: true,
			renderer: 'onSeriesTooltipRender',
		    },
		},
		me.seriesConfig,
	    ));
	});

	// enable animation after the store is loaded
	me.store.onAfter('load', function() {
	    me.setAnimation(true);
	}, this, { single: true });
    },
});

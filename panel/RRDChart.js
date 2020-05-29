Ext.define('Proxmox.widget.RRDChart', {
    extend: 'Ext.chart.CartesianChart',
    alias: 'widget.proxmoxRRDChart',

    unit: undefined, // bytes, bytespersecond, percent

    controller: {
	xclass: 'Ext.app.ViewController',

	convertToUnits: function(value) {
	    var units = ['', 'k','M','G','T', 'P'];
	    var si = 0;
	    let format = '0.##';
	    if (value < 0.1) format += '#';
	    while(value >= 1000  && si < (units.length -1)){
		value = value / 1000;
		si++;
	    }

	    // javascript floating point weirdness
	    value = Ext.Number.correctFloat(value);

	    // limit decimal points
	    value = Ext.util.Format.number(value, format);

	    return value.toString() + " " + units[si];
	},

	leftAxisRenderer: function(axis, label, layoutContext) {
	    var me = this;
	    return me.convertToUnits(label);
	},

	onSeriesTooltipRender: function(tooltip, record, item) {
	    var me = this.getView();

	    var suffix = '';

	    if (me.unit === 'percent') {
		suffix = '%';
	    } else if (me.unit === 'bytes') {
		suffix = 'B';
	    } else if (me.unit === 'bytespersecond') {
		suffix = 'B/s';
	    }

	    var prefix = item.field;
	    if (me.fieldTitles && me.fieldTitles[me.fields.indexOf(item.field)]) {
		prefix = me.fieldTitles[me.fields.indexOf(item.field)];
	    }
	    let v = this.convertToUnits(record.get(item.field));
	    let t = new Date(record.get('time'));
	    tooltip.setHtml(`${prefix}: ${v}${suffix}<br>${t}`);
	},

	onAfterAnimation: function(chart, eopts) {
	    // if the undo button is disabled, disable our tool
	    var ourUndoZoomButton = chart.header.tools[0];
	    var undoButton = chart.interactions[0].getUndoButton();
	    ourUndoZoomButton.setDisabled(undoButton.isDisabled());
	}
    },

    width: 770,
    height: 300,
    animation: false,
    interactions: [
	{
	    type: 'crosszoom'
	},
    ],
    legend: {
	docked: 'bottom'
    },
    axes: [
	{
	    type: 'numeric',
	    position: 'left',
	    grid: true,
	    renderer: 'leftAxisRenderer',
	    minimum: 0
	},
	{
	    type: 'time',
	    position: 'bottom',
	    grid: true,
	    fields: ['time']
	},
    ],
    listeners: {
	animationend: 'onAfterAnimation'
    },

    initComponent: function() {
	var me = this;
	var series = {};

	if (!me.store) {
	    throw "cannot work without store";
	}

	if (!me.fields) {
	    throw "cannot work without fields";
	}

	me.callParent();

	// add correct label for left axis
	var axisTitle = "";
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

	if (!me.noTool) {
	    me.addTool([{
		type: 'minus',
		disabled: true,
		tooltip: gettext('Undo Zoom'),
		handler: function(){
		    var undoButton = me.interactions[0].getUndoButton();
		    if (undoButton.handler) {
			undoButton.handler();
		    }
		}
	    },{
		type: 'restore',
		tooltip: gettext('Toggle Legend'),
		handler: function(){
		    if (me.legend) {
			me.legend.setVisible(!me.legend.isVisible());
		    }
		}
	    }]);
	}

	// add a series for each field we get
	me.fields.forEach(function(item, index){
	    var title = item;
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
			opacity: 0.60
		    },
		    marker: {
			opacity: 0,
			scaling: 0.01,
			fx: {
			    duration: 200,
			    easing: 'easeOut'
			}
		    },
		    highlightCfg: {
			opacity: 1,
			scaling: 1.5
		    },
		    tooltip: {
			trackMouse: true,
			renderer: 'onSeriesTooltipRender'
		    }
		},
		me.seriesConfig
	    ));
	});

	// enable animation after the store is loaded
	me.store.onAfter('load', function() {
	    me.setAnimation(true);
	}, this, {single: true});
    }
});

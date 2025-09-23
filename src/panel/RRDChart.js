// override the download server url globally, for privacy reasons
Ext.draw.Container.prototype.defaultDownloadServerUrl = '-';

Ext.define('Proxmox.chart.axis.segmenter.NumericBase2', {
    extend: 'Ext.chart.axis.segmenter.Numeric',
    alias: 'segmenter.numericBase2',

    // derived from the original numeric segmenter but using 2 instead of 10 as base
    preferredStep: function (min, estStepSize) {
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
    exactStep: function (min, estStepSize) {
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

    onLegendChange: Ext.emptyFn, // empty dummy function so we can add listener for legend events when needed

    controller: {
        xclass: 'Ext.app.ViewController',

        init: function (view) {
            this.powerOfTwo = view.powerOfTwo;
        },

        convertToUnits: function (value) {
            let units = ['', 'k', 'M', 'G', 'T', 'P'];
            let si = 0;
            let format = '0.##';
            if (value < 0.1) {
                format += '#';
            }
            const baseValue = this.powerOfTwo ? 1024 : 1000;
            while (value >= baseValue && si < units.length - 1) {
                value = value / baseValue;
                si++;
            }

            // javascript floating point weirdness
            value = Ext.Number.correctFloat(value);

            // limit decimal points
            value = Ext.util.Format.number(value, format);

            let unit = units[si];
            if (unit && this.powerOfTwo) {
                unit += 'i';
            }

            return `${value.toString()} ${unit}`;
        },

        leftAxisRenderer: function (axis, label, layoutContext) {
            let me = this;
            return me.convertToUnits(label);
        },

        onSeriesTooltipRender: function (tooltip, record, item) {
            let view = this.getView();

            let suffix = '';
            if (view.unit === 'percent') {
                suffix = '%';
            } else if (view.unit === 'bytes') {
                suffix = 'B';
            } else if (view.unit === 'bytespersecond') {
                suffix = 'B/s';
            }

            let value = record.get(item.field);
            if (value === null) {
                tooltip.setHtml(gettext('No Data'));
            } else {
                let prefix = item.field;
                if (view.fieldTitles && view.fieldTitles[view.fields.indexOf(item.field)]) {
                    prefix = view.fieldTitles[view.fields.indexOf(item.field)];
                } else {
                    // If series is passed in directly, we don't have fieldTitles set. The title property can be a
                    // single string for a line series, or an array for an area/stacked series.
                    for (const field of view.fields) {
                        if (Array.isArray(field.yField)) {
                            if (field.title && field.title[field.yField.indexOf(item.field)]) {
                                prefix = field.title[field.yField.indexOf(item.field)];
                                break;
                            }
                        } else if (field.yField === item.field && field.title) {
                            prefix = field.title;
                            break;
                        }
                    }
                }

                let v = this.convertToUnits(value);
                let t = new Date(record.get('time'));
                tooltip.setHtml(`${prefix}: ${v}${suffix}<br>${t}`);
            }
        },

        onAfterAnimation: function (chart, eopts) {
            if (!chart.header || !chart.header.tools) {
                return;
            }
            // if the undo button is disabled, disable our tool
            let ourUndoZoomButton = chart.lookupReference('undoButton');
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
        type: 'dom',
        padding: 0,
        style: 'cursor: pointer;',
    },
    axes: [
        {
            type: 'numeric',
            position: 'left',
            grid: true,
            renderer: 'leftAxisRenderer',
            minimum: 0,
        },
        {
            type: 'time',
            position: 'bottom',
            grid: true,
            fields: ['time'],
        },
    ],
    listeners: {
        redraw: {
            fn: 'onAfterAnimation',
            options: {
                buffer: 500,
            },
        },
    },

    touchAction: {
        panX: true,
        panY: true,
    },

    constructor: function (config) {
        let me = this;

        let segmenter = config.powerOfTwo ? 'numericBase2' : 'numeric';

        let axes = config.axes ?? me.config.axes ?? [];
        for (const axis of axes) {
            if (
                axis.type === 'numeric' &&
                (axis.position === 'left' || axis.position === 'right')
            ) {
                axis.segmenter = segmenter;
            }
        }

        me.callParent([config]);
    },

    checkThemeColors: function () {
        let me = this;
        let rootStyle = getComputedStyle(document.documentElement);

        // get colors
        let background = rootStyle.getPropertyValue('--pwt-panel-background').trim() || '#ffffff';
        let text = rootStyle.getPropertyValue('--pwt-text-color').trim() || '#000000';
        let primary = rootStyle.getPropertyValue('--pwt-chart-primary').trim() || '#000000';
        let gridStroke = rootStyle.getPropertyValue('--pwt-chart-grid-stroke').trim() || '#dddddd';

        // set the colors
        me.setBackground(background);
        me.axes.forEach((axis) => {
            axis.setLabel({ color: text });
            axis.setTitle({ color: text });
            axis.setStyle({ strokeStyle: primary });
            axis.setGrid({ stroke: gridStroke });
        });
        me.redraw();
    },

    initComponent: function () {
        let me = this;

        if (!me.store) {
            throw 'cannot work without store';
        }

        if (!me.fields) {
            throw 'cannot work without fields';
        }

        me.callParent();

        // add correct label for left axis
        let axisTitle = '';
        if (me.unit === 'percent') {
            axisTitle = '%';
        } else if (me.unit === 'bytes') {
            axisTitle = 'Bytes';
        } else if (me.unit === 'bytespersecond') {
            axisTitle = 'Bytes/s';
        } else if (me.fieldTitles && me.fieldTitles.length === 1) {
            axisTitle = me.fieldTitles[0];
        } else if (me.fields.length === 1) {
            axisTitle = me.fields[0];
        }

        me.axes[0].setTitle(axisTitle);

        me.updateHeader();

        if (me.header && me.legend) {
            // event itemclick is not documented for legend, but found it by printing all events happening
            me.legend.addListener('itemclick', me.onLegendChange);
            me.header.padding = '4 9 4';
            me.header.add(me.legend);
            me.legend = undefined;
        }

        if (!me.noTool) {
            me.addTool({
                type: 'minus',
                disabled: true,
                reference: 'undoButton',
                tooltip: gettext('Undo Zoom'),
                handler: function () {
                    let undoButton = me.interactions[0].getUndoButton();
                    if (undoButton.handler) {
                        undoButton.handler();
                    }
                },
            });
        }

        // add a series for each field we get
        me.fields.forEach(function (item, index) {
            let yField;
            let title;
            let object;

            if (typeof item === 'object') {
                object = item;
            } else {
                yField = item;
                title = item;
                if (me.fieldTitles && me.fieldTitles[index]) {
                    title = me.fieldTitles[index];
                }
            }
            me.addSeries(
                Ext.apply(
                    {
                        type: 'line',
                        xField: 'time',
                        yField,
                        title,
                        fill: true,
                        style: {
                            lineWidth: 1.5,
                            opacity: 0.6,
                        },
                        marker: {
                            opacity: 0,
                            scaling: 0.01,
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
                    object ?? me.seriesConfig,
                ),
            );
        });

        // enable animation after the store is loaded
        me.store.onAfter(
            'load',
            function () {
                me.setAnimation({
                    duration: 200,
                    easing: 'easeIn',
                });
            },
            this,
            { single: true },
        );

        me.checkThemeColors();

        // switch colors on media query changes
        me.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        me.themeListener = (e) => {
            me.checkThemeColors();
        };
        me.mediaQueryList.addEventListener('change', me.themeListener);
    },

    doDestroy: function () {
        let me = this;

        me.mediaQueryList.removeEventListener('change', me.themeListener);

        me.callParent();
    },
});

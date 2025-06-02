Ext.define('Proxmox.panel.GaugeWidget', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.proxmoxGauge',

    defaults: {
        style: {
            'text-align': 'center',
        },
    },
    items: [
        {
            xtype: 'box',
            itemId: 'title',
            data: {
                title: '',
            },
            tpl: '<h3>{title}</h3>',
        },
        {
            xtype: 'polar',
            height: 120,
            border: false,
            // set to '-' to suppress warning in debug mode
            downloadServerUrl: '-',
            itemId: 'chart',
            series: [
                {
                    type: 'gauge',
                    value: 0,
                    colors: ['#f5f5f5'],
                    sectors: [0],
                    donut: 90,
                    needleLength: 100,
                    totalAngle: Math.PI,
                },
            ],
            sprites: [
                {
                    id: 'valueSprite',
                    type: 'text',
                    text: '',
                    textAlign: 'center',
                    textBaseline: 'bottom',
                    x: 125,
                    y: 110,
                    fontSize: 30,
                },
            ],
        },
        {
            xtype: 'box',
            itemId: 'text',
        },
    ],

    header: false,
    border: false,

    warningThreshold: 0.6,
    criticalThreshold: 0.9,
    warningColor: '#fc0',
    criticalColor: '#FF6C59',
    defaultColor: '#c2ddf2',
    backgroundColor: '#f5f5f5',

    initialValue: 0,

    checkThemeColors: function () {
        let me = this;
        let rootStyle = getComputedStyle(document.documentElement);

        // get colors
        let panelBg = rootStyle.getPropertyValue('--pwt-panel-background').trim() || '#ffffff';
        let textColor = rootStyle.getPropertyValue('--pwt-text-color').trim() || '#000000';
        me.defaultColor = rootStyle.getPropertyValue('--pwt-gauge-default').trim() || '#c2ddf2';
        me.criticalColor = rootStyle.getPropertyValue('--pwt-gauge-crit').trim() || '#ff6c59';
        me.warningColor = rootStyle.getPropertyValue('--pwt-gauge-warn').trim() || '#fc0';
        me.backgroundColor = rootStyle.getPropertyValue('--pwt-gauge-back').trim() || '#f5f5f5';

        // set gauge colors
        let value = me.chart.series[0].getValue() / 100;

        let color = me.defaultColor;

        if (value >= me.criticalThreshold) {
            color = me.criticalColor;
        } else if (value >= me.warningThreshold) {
            color = me.warningColor;
        }

        me.chart.series[0].setColors([color, me.backgroundColor]);

        // set text and background colors
        me.chart.setBackground(panelBg);
        me.valueSprite.setAttributes({ fillStyle: textColor }, true);
        me.chart.redraw();
    },

    updateValue: function (value, text) {
        let me = this;
        let color = me.defaultColor;
        let attr = {};

        if (value >= me.criticalThreshold) {
            color = me.criticalColor;
        } else if (value >= me.warningThreshold) {
            color = me.warningColor;
        }

        me.chart.series[0].setColors([color, me.backgroundColor]);
        me.chart.series[0].setValue(value * 100);

        me.valueSprite.setText(' ' + (value * 100).toFixed(0) + '%');
        attr.x = me.chart.getWidth() / 2;
        attr.y = me.chart.getHeight() - 20;
        if (me.spriteFontSize) {
            attr.fontSize = me.spriteFontSize;
        }
        me.valueSprite.setAttributes(attr, true);

        if (text !== undefined) {
            me.text.setHtml(text);
        }
    },

    initComponent: function () {
        let me = this;

        me.callParent();

        if (me.title) {
            me.getComponent('title').update({ title: me.title });
        }
        me.text = me.getComponent('text');
        me.chart = me.getComponent('chart');
        me.valueSprite = me.chart.getSurface('chart').get('valueSprite');

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

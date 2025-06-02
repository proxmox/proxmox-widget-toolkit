Ext.define('Proxmox.form.SizeField', {
    extend: 'Ext.form.FieldContainer',
    alias: 'widget.pmxSizeField',

    mixins: ['Proxmox.Mixin.CBind'],

    viewModel: {
        data: {
            unit: 'MiB',
            unitPostfix: '',
        },
        formulas: {
            unitlabel: (get) => get('unit') + get('unitPostfix'),
        },
    },

    emptyText: '',

    layout: 'hbox',
    defaults: {
        hideLabel: true,
    },

    // display unit (TODO: make (optionally) selectable)
    unit: 'MiB',
    unitPostfix: '',

    // use this if the backend saves values in another unit than bytes, e.g.,
    // for KiB set it to 'KiB'
    backendUnit: undefined,

    // submit a canonical size unit, e.g., 20.5 MiB
    submitAutoScaledSizeUnit: false,

    // allow setting 0 and using it as a submit value
    allowZero: false,

    emptyValue: null,

    items: [
        {
            xtype: 'numberfield',
            cbind: {
                name: '{name}',
                emptyText: '{emptyText}',
                allowZero: '{allowZero}',
                emptyValue: '{emptyValue}',
            },
            minValue: 0,
            step: 1,
            submitLocaleSeparator: false,
            fieldStyle: 'text-align: right',
            flex: 1,
            enableKeyEvents: true,
            setValue: function (v) {
                if (!this._transformed) {
                    let fieldContainer = this.up('fieldcontainer');
                    let vm = fieldContainer.getViewModel();
                    let unit = vm.get('unit');

                    if (typeof v === 'string') {
                        v = Proxmox.Utils.size_unit_to_bytes(v);
                    }
                    v /= Proxmox.Utils.SizeUnits[unit];
                    v *= fieldContainer.backendFactor;

                    this._transformed = true;
                }

                if (Number(v) === 0 && !this.allowZero) {
                    v = undefined;
                }

                return Ext.form.field.Text.prototype.setValue.call(this, v);
            },
            getSubmitValue: function () {
                let v = this.processRawValue(this.getRawValue());
                v = v.replace(this.decimalSeparator, '.');

                if (v === undefined || v === '') {
                    return this.emptyValue;
                }

                if (Number(v) === 0) {
                    return this.allowZero ? 0 : null;
                }

                let fieldContainer = this.up('fieldcontainer');
                let vm = fieldContainer.getViewModel();
                let unit = vm.get('unit');

                v = parseFloat(v) * Proxmox.Utils.SizeUnits[unit];

                if (fieldContainer.submitAutoScaledSizeUnit) {
                    return Proxmox.Utils.format_size(v, !unit.endsWith('iB'));
                } else {
                    return String(Math.floor(v / fieldContainer.backendFactor));
                }
            },
            listeners: {
                // our setValue gets only called if we have a value, avoid
                // transformation of the first user-entered value
                keydown: function () {
                    this._transformed = true;
                },
            },
        },
        {
            xtype: 'displayfield',
            name: 'unit',
            submitValue: false,
            padding: '0 0 0 10',
            bind: {
                value: '{unitlabel}',
            },
            listeners: {
                change: (f, v) => {
                    f.originalValue = v;
                },
            },
            width: 40,
        },
    ],

    initComponent: function () {
        let me = this;

        me.unit = me.unit || 'MiB';
        if (!(me.unit in Proxmox.Utils.SizeUnits)) {
            throw 'unknown unit: ' + me.unit;
        }

        me.backendFactor = 1;
        if (me.backendUnit !== undefined) {
            if (!(me.unit in Proxmox.Utils.SizeUnits)) {
                throw 'unknown backend unit: ' + me.backendUnit;
            }
            me.backendFactor = Proxmox.Utils.SizeUnits[me.backendUnit];
        }

        me.callParent(arguments);

        me.getViewModel().set('unit', me.unit);
        me.getViewModel().set('unitPostfix', me.unitPostfix);
    },
});

Ext.define('Proxmox.form.BandwidthField', {
    extend: 'Proxmox.form.SizeField',
    alias: 'widget.pmxBandwidthField',

    unitPostfix: '/s',
});

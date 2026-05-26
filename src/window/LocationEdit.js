Ext.define('Proxmox.window.LocationEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pmxLocationEditWindow',

    title: gettext('Location'),

    autoLoad: true,

    // make a bit wider for the hint field
    width: 400,

    controller: {
        xclass: 'Ext.app.ViewController',

        isValidCoordinate: function (lat, long) {
            if (!Ext.isNumber(lat) || !Ext.isNumber(long)) {
                return false;
            }
            return lat >= -90 && lat <= 90 && long >= -180 && long <= 180;
        },

        onPaste: function (_field, event) {
            let me = this;
            let data = event.getClipboardData();
            if (Ext.isString(data)) {
                let [lat, long] = data.split(',').map(Number);
                if (me.isValidCoordinate(lat, long)) {
                    me.lookup('latitude').setValue(lat);
                    me.lookup('longitude').setValue(long);
                    event.preventDefault();
                }
            }
        },

        control: {
            numberfield: {
                paste: 'onPaste',
            },
        },
    },

    items: [
        {
            xtype: 'inputpanel',
            onGetValues: function (values) {
                let propertyString = Proxmox.Utils.printPropertyString(values);
                if (!propertyString) {
                    return { delete: 'location' };
                } else {
                    return {
                        location: propertyString,
                    };
                }
            },

            onSetValues: function (value) {
                if (value.location) {
                    return Proxmox.Utils.parsePropertyString(value.location);
                }
                return {};
            },

            items: [
                {
                    xtype: 'proxmoxtextfield',
                    fieldLabel: gettext('Name'),
                    allowBlank: true,
                    emptyText: gettext('Optional'),
                    regex: /^[^,=]+$/,
                    regexText: gettext('No "," and "=" allowed'),
                    name: 'name',
                },
                {
                    xtype: 'numberfield',
                    minimum: -90.0,
                    maximum: 90.0,
                    reference: 'latitude',
                    name: 'latitude',
                    decimalPrecision: 6,
                    fieldLabel: gettext('Latitude'),
                    enableKeyEvents: true,
                },
                {
                    xtype: 'numberfield',
                    minimum: -180.0,
                    maximum: 180.0,
                    reference: 'longitude',
                    name: 'longitude',
                    decimalPrecision: 6,
                    fieldLabel: gettext('Longitude'),
                    enableKeyEvents: true,
                },
                {
                    xtype: 'displayfield',
                    value: gettext(
                        'You can paste text in format "Latitude, Longitude" in either field.',
                    ),
                    userCls: 'pmx-hint',
                },
            ],
        },
    ],
});

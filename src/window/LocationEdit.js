Ext.define('Proxmox.window.LocationEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pmxLocationEditWindow',

    title: gettext('Location'),

    autoLoad: true,

    // make a bit wider for the hint
    width: 400,

    controller: {
        xclass: 'Ext.app.ViewController',

        isValidCoordinate: function (lat, long) {
            if (!Ext.isNumber(lat) || !Ext.isNumber(long)) {
                return false;
            }
            return lat >= -90 && lat <= 90 && long >= -180 && long <= 180;
        },

        // Accepts:
        //   - plain decimal pairs separated by comma, semicolon, or whitespace
        //   - OpenStreetMap URLs (#map=zoom/lat/lon permalinks, ?mlat=&mlon= markers)
        //   - Google Maps URLs (/maps?q=lat,lon, /maps?ll=lat,lon, /@lat,lon,zoom)
        // The Google Maps patterns require a /maps or /@ anchor so unrelated text that
        // happens to contain a similar substring does not get parsed as coordinates.
        parseCoordinates: function (data) {
            if (!Ext.isString(data)) {
                return null;
            }
            let patterns = [
                /#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/,
                /[?&]mlat=(-?\d+(?:\.\d+)?)&mlon=(-?\d+(?:\.\d+)?)/,
                /\/maps\S*[?&](?:q|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/,
                /\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),[\d.]+[a-z]\b/,
                /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
            ];
            for (let pattern of patterns) {
                let match = data.trim().match(pattern);
                if (match) {
                    return [Number(match[1]), Number(match[2])];
                }
            }
            return null;
        },

        onPaste: function (_field, event) {
            let me = this;
            let coords = me.parseCoordinates(event.getClipboardData());
            if (coords && me.isValidCoordinate(coords[0], coords[1])) {
                me.lookup('latitude').setValue(coords[0]);
                me.lookup('longitude').setValue(coords[1]);
                event.preventDefault();
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
                    value: Ext.String.format(
                        gettext(
                            'To find coordinates, right-click a location on {0} or Google Maps.' +
                                ' You can paste them as "Latitude, Longitude" or paste a URL from' +
                                ' those services into either field above.',
                        ),
                        '<a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>',
                    ),
                },
            ],
        },
    ],
});

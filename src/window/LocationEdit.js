Ext.define('Proxmox.window.LocationEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pmxLocationEditWindow',

    title: gettext('Location'),

    autoLoad: true,

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
                    name: 'name',
                },
                {
                    xtype: 'numberfield',
                    minimum: -90.0,
                    maximum: 90.0,
                    name: 'latitude',
                    decimalPrecision: 6,
                    fieldLabel: gettext('Latitude'),
                },
                {
                    xtype: 'numberfield',
                    minimum: -180.0,
                    maximum: 180.0,
                    name: 'longitude',
                    decimalPrecision: 6,
                    fieldLabel: gettext('Longitude'),
                },
            ],
        },
    ],
});

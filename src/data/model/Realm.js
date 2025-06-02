Ext.define('pmx-domains', {
    extend: 'Ext.data.Model',
    fields: [
        'realm',
        'type',
        'comment',
        'default',
        {
            name: 'tfa',
            allowNull: true,
        },
        {
            name: 'descr',
            convert: function (value, { data = {} }) {
                if (value) return Ext.String.htmlEncode(value);

                let text = data.comment || data.realm;

                if (data.tfa) {
                    text += ` (+ ${data.tfa})`;
                }

                return Ext.String.htmlEncode(text);
            },
        },
    ],
    idProperty: 'realm',
    proxy: {
        type: 'proxmox',
        url: '/api2/json/access/domains',
    },
});

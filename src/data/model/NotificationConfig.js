Ext.define('proxmox-notification-endpoints', {
    extend: 'Ext.data.Model',
    fields: ['name', 'type', 'comment', 'disable', 'origin'],
    proxy: {
        type: 'proxmox',
    },
    idProperty: 'name',
});

Ext.define('proxmox-notification-matchers', {
    extend: 'Ext.data.Model',
    fields: ['name', 'comment', 'disable', 'origin'],
    proxy: {
        type: 'proxmox',
    },
    idProperty: 'name',
});

Ext.define('proxmox-notification-fields', {
    extend: 'Ext.data.Model',
    fields: ['name', 'description'],
    idProperty: 'name',
});

Ext.define('proxmox-notification-field-values', {
    extend: 'Ext.data.Model',
    fields: ['value', 'comment', 'field'],
    idProperty: 'value',
});

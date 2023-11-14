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

Ext.define('proxmox-notification-endpoints', {
    extend: 'Ext.data.Model',
    fields: ['name', 'type', 'comment'],
    proxy: {
        type: 'proxmox',
    },
    idProperty: 'name',
});

Ext.define('proxmox-notification-filters', {
    extend: 'Ext.data.Model',
    fields: ['name', 'comment'],
    proxy: {
        type: 'proxmox',
    },
    idProperty: 'name',
});

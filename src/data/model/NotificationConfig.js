Ext.define('proxmox-notification-endpoints', {
    extend: 'Ext.data.Model',
    fields: ['name', 'type', 'comment'],
    proxy: {
        type: 'proxmox',
    },
    idProperty: 'name',
});

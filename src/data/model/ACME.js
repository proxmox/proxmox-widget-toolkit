Ext.define('proxmox-acme-accounts', {
    extend: 'Ext.data.Model',
    fields: ['name'],
    proxy: {
	type: 'proxmox',
    },
    idProperty: 'name',
});

Ext.define('proxmox-acme-challenges', {
    extend: 'Ext.data.Model',
    fields: ['id', 'type', 'schema'],
    proxy: {
	type: 'proxmox',
    },
    idProperty: 'id',
});


Ext.define('proxmox-acme-plugins', {
    extend: 'Ext.data.Model',
    fields: ['type', 'plugin', 'api'],
    proxy: {
	type: 'proxmox',
    },
    idProperty: 'plugin',
});

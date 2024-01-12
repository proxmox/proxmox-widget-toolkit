Ext.define('Proxmox.panel.ADInputPanel', {
    extend: 'Proxmox.panel.LDAPInputPanel',
    xtype: 'pmxAuthADPanel',

    type: 'ad',
    onlineHelp: 'user-realms-ad',
});

Ext.define('Proxmox.panel.ADSyncInputPanel', {
    extend: 'Proxmox.panel.LDAPSyncInputPanel',
    xtype: 'pmxAuthADSyncPanel',

    type: 'ad',
});

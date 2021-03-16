Ext.define('proxmox-certificate', {
    extend: 'Ext.data.Model',

    fields: ['filename', 'fingerprint', 'issuer', 'notafter', 'notbefore', 'subject', 'san', 'public-key-bits', 'public-key-type'],
    idProperty: 'filename',
});

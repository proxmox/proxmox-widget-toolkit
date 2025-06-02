Ext.define('Proxmox.window.ConsentModal', {
    extend: 'Ext.window.Window',
    alias: ['widget.pmxConsentModal'],
    mixins: ['Proxmox.Mixin.CBind'],

    maxWidth: 1000,
    maxHeight: 1000,
    minWidth: 600,
    minHeight: 400,
    scrollable: true,
    modal: true,
    closable: false,
    resizable: false,
    alwaysOnTop: true,
    title: gettext('Consent'),

    items: [
        {
            xtype: 'displayfield',
            padding: 10,
            scrollable: true,
            cbind: {
                value: '{consent}',
            },
        },
    ],
    buttons: [
        {
            handler: function () {
                this.up('window').close();
            },
            text: gettext('OK'),
        },
    ],
});

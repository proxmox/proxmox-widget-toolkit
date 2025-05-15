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

    onResize: function () {
        let me = this;
        let viewportSize = Ext.getBody().getViewSize();

        let originalSize = me.originalSize ?? me.getSize();
        // limit to viewport size - 10px for safety
        let newSize = {
            width: Math.min(originalSize.width, viewportSize.width - 10),
            height: Math.min(originalSize.height, viewportSize.height - 10),
        };

        me.setSize(newSize);
        me.alignTo(Ext.getBody(), 'c-c');
    },

    afterComponentLayout: function (width, height) {
        let me = this;
        me.originalSize ??= { width, height };
    },

    listeners: {
        resize: 'onResize',
    },

    initComponent: function () {
        let me = this;
        me.callParent();
        me.mon(Ext.getBody(), 'resize', me.onResize, me);
    },
});

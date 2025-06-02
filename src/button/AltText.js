Ext.define('Proxmox.button.AltText', {
    extend: 'Proxmox.button.Button',
    xtype: 'proxmoxAltTextButton',

    defaultText: '',
    altText: '',

    listeners: {
        // HACK: calculate the max button width on first render to avoid toolbar glitches
        render: function (button) {
            let me = this;

            button.setText(me.altText);
            let altWidth = button.getSize().width;

            button.setText(me.defaultText);
            let defaultWidth = button.getSize().width;

            button.setWidth(defaultWidth > altWidth ? defaultWidth : altWidth);
        },
    },
});

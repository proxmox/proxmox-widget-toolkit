Ext.define('PMX.image.Logo', {
    extend: 'Ext.Img',
    xtype: 'proxmoxlogo',

    height: 30,
    width: 172,
    src: '/images/proxmox_logo.png',
    alt: 'Proxmox',
    autoEl: {
        tag: 'a',
        href: 'https://www.proxmox.com',
        target: '_blank',
    },

    initComponent: function () {
        let me = this;
        let prefix = me.prefix !== undefined ? me.prefix : '/pve2';
        me.src = prefix + me.src;
        me.callParent();
    },
});

Ext.define('PMX.image.LogoSVG', {
    extend: 'Ext.Img',
    xtype: 'proxmoxLogoSvg',

    height: 35,
    width: 200,
    src: '/images/proxmox_logo.svg',
    alt: 'Proxmox',
    autoEl: {
        tag: 'a',
        href: 'https://www.proxmox.com',
        target: '_blank',
    },

    initComponent: function () {
        let me = this;
        let prefix = me.prefix !== undefined ? me.prefix : '/pve2';
        me.src = prefix + me.src;
        me.callParent();
    },
});

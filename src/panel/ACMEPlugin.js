Ext.define('Proxmox.panel.ACMEPluginView', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pmxACMEPluginView',

    title: gettext('Challenge Plugins'),
    acmeUrl: undefined,

    controller: {
        xclass: 'Ext.app.ViewController',

        addPlugin: function () {
            let me = this;
            let view = me.getView();
            Ext.create('Proxmox.window.ACMEPluginEdit', {
                acmeUrl: view.acmeUrl,
                url: `${view.acmeUrl}/plugins`,
                isCreate: true,
                apiCallDone: function () {
                    me.reload();
                },
            }).show();
        },

        editPlugin: function () {
            let me = this;
            let view = me.getView();
            let selection = view.getSelection();
            if (selection.length < 1) return;
            let plugin = selection[0].data.plugin;
            Ext.create('Proxmox.window.ACMEPluginEdit', {
                acmeUrl: view.acmeUrl,
                url: `${view.acmeUrl}/plugins/${plugin}`,
                apiCallDone: function () {
                    me.reload();
                },
            }).show();
        },

        reload: function () {
            let me = this;
            let view = me.getView();
            view.getStore().rstore.load();
        },
    },

    minHeight: 150,
    emptyText: gettext('No Plugins configured'),

    columns: [
        {
            dataIndex: 'plugin',
            text: gettext('Plugin'),
            renderer: Ext.String.htmlEncode,
            flex: 1,
        },
        {
            dataIndex: 'api',
            text: 'API',
            renderer: Ext.String.htmlEncode,
            flex: 1,
        },
    ],

    listeners: {
        itemdblclick: 'editPlugin',
    },

    store: {
        type: 'diff',
        autoDestroy: true,
        autoDestroyRstore: true,
        rstore: {
            type: 'update',
            storeid: 'proxmox-acme-plugins',
            model: 'proxmox-acme-plugins',
            autoStart: true,
            filters: (item) => !!item.data.api,
        },
        sorters: 'plugin',
    },

    initComponent: function () {
        let me = this;

        if (!me.acmeUrl) {
            throw 'no acmeUrl given';
        }
        me.url = `${me.acmeUrl}/plugins`;

        Ext.apply(me, {
            tbar: [
                {
                    xtype: 'proxmoxButton',
                    text: gettext('Add'),
                    handler: 'addPlugin',
                    selModel: false,
                },
                {
                    xtype: 'proxmoxButton',
                    text: gettext('Edit'),
                    handler: 'editPlugin',
                    disabled: true,
                },
                {
                    xtype: 'proxmoxStdRemoveButton',
                    callback: 'reload',
                    baseurl: `${me.acmeUrl}/plugins`,
                },
            ],
        });

        me.callParent();

        me.store.rstore.proxy.setUrl(`/api2/json/${me.acmeUrl}/plugins`);
    },
});

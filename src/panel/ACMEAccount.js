Ext.define('Proxmox.panel.ACMEAccounts', {
    extend: 'Ext.grid.Panel',
    xtype: 'pmxACMEAccounts',

    title: gettext('Accounts'),

    acmeUrl: undefined,

    controller: {
        xclass: 'Ext.app.ViewController',

        addAccount: function () {
            let me = this;
            let view = me.getView();
            let defaultExists = view.getStore().findExact('name', 'default') !== -1;
            Ext.create('Proxmox.window.ACMEAccountCreate', {
                defaultExists,
                acmeUrl: view.acmeUrl,
                taskDone: function () {
                    me.reload();
                },
            }).show();
        },

        viewAccount: function () {
            let me = this;
            let view = me.getView();
            let selection = view.getSelection();
            if (selection.length < 1) {
                return;
            }
            Ext.create('Proxmox.window.ACMEAccountView', {
                url: `${view.acmeUrl}/account/${selection[0].data.name}`,
            }).show();
        },

        reload: function () {
            let me = this;
            let view = me.getView();
            view.getStore().rstore.load();
        },

        showTaskAndReload: function (options, success, response) {
            let me = this;
            if (!success) {
                return;
            }

            let upid = response.result.data;
            Ext.create('Proxmox.window.TaskProgress', {
                upid,
                taskDone: function () {
                    me.reload();
                },
            }).show();
        },
    },

    minHeight: 150,
    emptyText: gettext('No Accounts configured'),

    columns: [
        {
            dataIndex: 'name',
            text: gettext('Name'),
            renderer: Ext.String.htmlEncode,
            flex: 1,
        },
    ],

    listeners: {
        itemdblclick: 'viewAccount',
    },

    store: {
        type: 'diff',
        autoDestroy: true,
        autoDestroyRstore: true,
        rstore: {
            type: 'update',
            storeid: 'proxmox-acme-accounts',
            model: 'proxmox-acme-accounts',
            autoStart: true,
        },
        sorters: 'name',
    },

    initComponent: function () {
        let me = this;

        if (!me.acmeUrl) {
            throw 'no acmeUrl given';
        }

        Ext.apply(me, {
            tbar: [
                {
                    xtype: 'proxmoxButton',
                    text: gettext('Add'),
                    selModel: false,
                    handler: 'addAccount',
                },
                {
                    xtype: 'proxmoxButton',
                    text: gettext('View'),
                    handler: 'viewAccount',
                    disabled: true,
                },
                {
                    xtype: 'proxmoxStdRemoveButton',
                    baseurl: `${me.acmeUrl}/account`,
                    callback: 'showTaskAndReload',
                },
            ],
        });

        me.callParent();
        me.store.rstore.proxy.setUrl(`/api2/json/${me.acmeUrl}/account`);
    },
});

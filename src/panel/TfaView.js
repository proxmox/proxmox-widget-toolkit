Ext.define('pmx-tfa-users', {
    extend: 'Ext.data.Model',
    fields: ['userid'],
    idProperty: 'userid',
    proxy: {
        type: 'proxmox',
        url: '/api2/json/access/tfa',
    },
});

Ext.define('pmx-tfa-entry', {
    extend: 'Ext.data.Model',
    fields: ['fullid', 'userid', 'type', 'description', 'created', 'enable'],
    idProperty: 'fullid',
});

Ext.define('Proxmox.panel.TfaView', {
    extend: 'Ext.grid.GridPanel',
    alias: 'widget.pmxTfaView',
    mixins: ['Proxmox.Mixin.CBind'],

    title: gettext('Second Factors'),
    reference: 'tfaview',

    issuerName: 'Proxmox',
    yubicoEnabled: false,

    cbindData: function (initialConfig) {
        let me = this;
        return {
            yubicoEnabled: me.yubicoEnabled,
        };
    },

    store: {
        type: 'diff',
        autoDestroy: true,
        autoDestroyRstore: true,
        model: 'pmx-tfa-entry',
        rstore: {
            type: 'store',
            proxy: 'memory',
            storeid: 'pmx-tfa-entry',
            model: 'pmx-tfa-entry',
        },
    },

    controller: {
        xclass: 'Ext.app.ViewController',

        init: function (view) {
            let me = this;
            view.tfaStore = Ext.create('Proxmox.data.UpdateStore', {
                autoStart: true,
                interval: 5 * 1000,
                storeid: 'pmx-tfa-users',
                model: 'pmx-tfa-users',
            });
            view.tfaStore.on('load', this.onLoad, this);
            view.on('destroy', view.tfaStore.stopUpdate);
            Proxmox.Utils.monStoreErrors(view, view.tfaStore);
        },

        reload: function () {
            this.getView().tfaStore.load();
        },

        onLoad: function (store, data, success) {
            if (!success) return;

            let now = new Date().getTime() / 1000;
            let records = [];
            Ext.Array.each(data, (user) => {
                let tfa_locked = (user.data['tfa-locked-until'] || 0) > now;
                let totp_locked = user.data['totp-locked'];
                Ext.Array.each(user.data.entries, (entry) => {
                    records.push({
                        fullid: `${user.id}/${entry.id}`,
                        userid: user.id,
                        type: entry.type,
                        description: entry.description,
                        created: entry.created,
                        enable: entry.enable,
                        locked: tfa_locked || (entry.type === 'totp' && totp_locked),
                    });
                });
            });

            let rstore = this.getView().store.rstore;
            rstore.loadData(records);
            rstore.fireEvent('load', rstore, records, true);
        },

        addTotp: function () {
            let me = this;

            Ext.create('Proxmox.window.AddTotp', {
                isCreate: true,
                issuerName: me.getView().issuerName,
                listeners: {
                    destroy: function () {
                        me.reload();
                    },
                },
            }).show();
        },

        addWebauthn: function () {
            let me = this;

            Ext.create('Proxmox.window.AddWebauthn', {
                isCreate: true,
                autoShow: true,
                listeners: {
                    destroy: () => me.reload(),
                },
            });
        },

        addRecovery: async function () {
            let me = this;

            Ext.create('Proxmox.window.AddTfaRecovery', {
                autoShow: true,
                listeners: {
                    destroy: () => me.reload(),
                },
            });
        },

        addYubico: function () {
            let me = this;

            Ext.create('Proxmox.window.AddYubico', {
                isCreate: true,
                autoShow: true,
                listeners: {
                    destroy: () => me.reload(),
                },
            });
        },

        editItem: function () {
            let me = this;
            let view = me.getView();
            let selection = view.getSelection();
            if (selection.length !== 1 || selection[0].id.endsWith('/recovery')) {
                return;
            }

            Ext.create('Proxmox.window.TfaEdit', {
                'tfa-id': selection[0].data.fullid,
                autoShow: true,
                listeners: {
                    destroy: () => me.reload(),
                },
            });
        },

        renderUser: (fullid) => fullid.split('/')[0],

        renderEnabled: function (enabled, metaData, record) {
            if (record.data.locked) {
                return gettext('Locked');
            } else if (enabled === undefined) {
                return Proxmox.Utils.yesText;
            } else {
                return Proxmox.Utils.format_boolean(enabled);
            }
        },

        onRemoveButton: function (btn, event, record) {
            let me = this;

            Ext.create('Proxmox.tfa.confirmRemove', {
                ...record.data,
                callback: (password) => me.removeItem(password, record),
                autoShow: true,
            });
        },

        removeItem: async function (password, record) {
            let me = this;

            if (password !== null) {
                password = '?password=' + encodeURIComponent(password);
            } else {
                password = '';
            }

            try {
                me.getView().mask(gettext('Please wait...'), 'x-mask-loading');
                await Proxmox.Async.api2({
                    url: `/api2/extjs/access/tfa/${record.id}${password}`,
                    method: 'DELETE',
                });
                me.reload();
            } catch (response) {
                Ext.Msg.alert(gettext('Error'), response.result.message);
            } finally {
                me.getView().unmask();
            }
        },
    },

    viewConfig: {
        trackOver: false,
    },

    listeners: {
        itemdblclick: 'editItem',
    },

    columns: [
        {
            header: gettext('User'),
            width: 200,
            sortable: true,
            dataIndex: 'fullid',
            renderer: 'renderUser',
        },
        {
            header: gettext('Enabled'),
            width: 80,
            sortable: true,
            dataIndex: 'enable',
            renderer: 'renderEnabled',
        },
        {
            header: gettext('TFA Type'),
            width: 80,
            sortable: true,
            dataIndex: 'type',
        },
        {
            header: gettext('Created'),
            width: 150,
            sortable: true,
            dataIndex: 'created',
            renderer: (t) => (!t ? 'N/A' : Proxmox.Utils.render_timestamp(t)),
        },
        {
            header: gettext('Description'),
            width: 300,
            sortable: true,
            dataIndex: 'description',
            renderer: Ext.String.htmlEncode,
            flex: 1,
        },
    ],

    tbar: [
        {
            text: gettext('Add'),
            cbind: {},
            menu: {
                xtype: 'menu',
                items: [
                    {
                        text: gettext('TOTP'),
                        itemId: 'totp',
                        iconCls: 'fa fa-fw fa-clock-o',
                        handler: 'addTotp',
                    },
                    {
                        text: gettext('WebAuthn'),
                        itemId: 'webauthn',
                        iconCls: 'fa fa-fw fa-shield',
                        handler: 'addWebauthn',
                    },
                    {
                        text: gettext('Recovery Keys'),
                        itemId: 'recovery',
                        iconCls: 'fa fa-fw fa-file-text-o',
                        handler: 'addRecovery',
                    },
                    {
                        text: gettext('Yubico OTP'),
                        itemId: 'yubico',
                        iconCls: 'fa fa-fw fa-yahoo', // close enough
                        handler: 'addYubico',
                        cbind: {
                            hidden: '{!yubicoEnabled}',
                        },
                    },
                ],
            },
        },
        '-',
        {
            xtype: 'proxmoxButton',
            text: gettext('Edit'),
            handler: 'editItem',
            enableFn: (rec) => !rec.id.endsWith('/recovery'),
            disabled: true,
        },
        {
            xtype: 'proxmoxButton',
            disabled: true,
            text: gettext('Remove'),
            getRecordName: (rec) => rec.data.description,
            handler: 'onRemoveButton',
        },
    ],
});

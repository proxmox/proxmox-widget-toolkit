Ext.define('proxmox-acme-domains', {
    extend: 'Ext.data.Model',
    fields: ['domain', 'type', 'alias', 'plugin', 'configkey'],
    idProperty: 'domain',
});

Ext.define('Proxmox.panel.ACMEDomains', {
    extend: 'Ext.grid.Panel',
    xtype: 'pmxACMEDomains',
    mixins: ['Proxmox.Mixin.CBind'],

    margin: '10 0 0 0',
    title: 'ACME',

    emptyText: gettext('No Domains configured'),

    // URL to the config containing 'acme' and 'acmedomainX' properties
    url: undefined,

    // array of { name, url, usageLabel }
    domainUsages: undefined,
    // if no domainUsages parameter is supllied, the orderUrl is required instead:
    orderUrl: undefined,
    // Force the use of 'acmedomainX' properties.
    separateDomainEntries: undefined,

    acmeUrl: undefined,

    cbindData: function (config) {
        let me = this;
        return {
            acmeUrl: me.acmeUrl,
            accountUrl: `/api2/json/${me.acmeUrl}/account`,
        };
    },

    viewModel: {
        data: {
            domaincount: 0,
            account: undefined, // the account we display
            configaccount: undefined, // the account set in the config
            accountEditable: false,
            accountsAvailable: false,
            hasUsage: false,
        },

        formulas: {
            canOrder: (get) => !!get('account') && get('domaincount') > 0,
            editBtnIcon: (get) => 'fa black fa-' + (get('accountEditable') ? 'check' : 'pencil'),
            accountTextHidden: (get) => get('accountEditable') || !get('accountsAvailable'),
            accountValueHidden: (get) => !get('accountEditable') || !get('accountsAvailable'),
        },
    },

    controller: {
        xclass: 'Ext.app.ViewController',

        init: function (view) {
            let accountSelector = this.lookup('accountselector');
            accountSelector.store.on('load', this.onAccountsLoad, this);
        },

        onAccountsLoad: function (store, records, success) {
            let me = this;
            let vm = me.getViewModel();
            let configaccount = vm.get('configaccount');
            vm.set('accountsAvailable', records.length > 0);
            if (me.autoChangeAccount && records.length > 0) {
                me.changeAccount(records[0].data.name, () => {
                    vm.set('accountEditable', false);
                    me.reload();
                });
                me.autoChangeAccount = false;
            } else if (configaccount) {
                if (store.findExact('name', configaccount) !== -1) {
                    vm.set('account', configaccount);
                } else {
                    vm.set('account', null);
                }
            }
        },

        addDomain: function () {
            let me = this;
            let view = me.getView();

            Ext.create('Proxmox.window.ACMEDomainEdit', {
                url: view.url,
                acmeUrl: view.acmeUrl,
                nodeconfig: view.nodeconfig,
                domainUsages: view.domainUsages,
                separateDomainEntries: view.separateDomainEntries,
                apiCallDone: function () {
                    me.reload();
                },
            }).show();
        },

        editDomain: function () {
            let me = this;
            let view = me.getView();

            let selection = view.getSelection();
            if (selection.length < 1) return;

            Ext.create('Proxmox.window.ACMEDomainEdit', {
                url: view.url,
                acmeUrl: view.acmeUrl,
                nodeconfig: view.nodeconfig,
                domainUsages: view.domainUsages,
                separateDomainEntries: view.separateDomainEntries,
                domain: selection[0].data,
                apiCallDone: function () {
                    me.reload();
                },
            }).show();
        },

        removeDomain: function () {
            let me = this;
            let view = me.getView();
            let selection = view.getSelection();
            if (selection.length < 1) return;

            let rec = selection[0].data;
            let params = {};
            if (rec.configkey !== 'acme') {
                params.delete = rec.configkey;
            } else {
                let acme = Proxmox.Utils.parseACME(view.nodeconfig.acme);
                Proxmox.Utils.remove_domain_from_acme(acme, rec.domain);
                params.acme = Proxmox.Utils.printACME(acme);
            }

            Proxmox.Utils.API2Request({
                method: 'PUT',
                url: view.url,
                params,
                success: function (response, opt) {
                    me.reload();
                },
                failure: function (response, opt) {
                    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
                },
            });
        },

        toggleEditAccount: function () {
            let me = this;
            let vm = me.getViewModel();
            let editable = vm.get('accountEditable');
            if (editable) {
                me.changeAccount(vm.get('account'), function () {
                    vm.set('accountEditable', false);
                    me.reload();
                });
            } else {
                vm.set('accountEditable', true);
            }
        },

        changeAccount: function (account, callback) {
            let me = this;
            let view = me.getView();
            let params = {};

            let acme = Proxmox.Utils.parseACME(view.nodeconfig.acme);
            acme.account = account;
            params.acme = Proxmox.Utils.printACME(acme);

            Proxmox.Utils.API2Request({
                method: 'PUT',
                waitMsgTarget: view,
                url: view.url,
                params,
                success: function (response, opt) {
                    if (Ext.isFunction(callback)) {
                        callback();
                    }
                },
                failure: function (response, opt) {
                    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
                },
            });
        },

        order: function (cert) {
            let me = this;
            let view = me.getView();

            Proxmox.Utils.API2Request({
                method: 'POST',
                params: {
                    force: 1,
                },
                url: cert ? cert.url : view.orderUrl,
                success: function (response, opt) {
                    Ext.create('Proxmox.window.TaskViewer', {
                        upid: response.result.data,
                        taskDone: function (success) {
                            me.orderFinished(success, cert);
                        },
                    }).show();
                },
                failure: function (response, opt) {
                    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
                },
            });
        },

        orderFinished: function (success, cert) {
            if (!success || !cert.reloadUi) return;

            Ext.getBody().mask(
                gettext(
                    'API server will be restarted to use new certificates, please reload web-interface!',
                ),
                ['pve-static-mask'],
            );
            // try to reload after 10 seconds automatically
            Ext.defer(() => window.location.reload(true), 10000);
        },

        reload: function () {
            let me = this;
            let view = me.getView();
            view.rstore.load();
        },

        addAccount: function () {
            let me = this;
            let view = me.getView();
            Ext.create('Proxmox.window.ACMEAccountCreate', {
                autoShow: true,
                acmeUrl: view.acmeUrl,
                taskDone: function () {
                    me.reload();
                    let accountSelector = me.lookup('accountselector');
                    me.autoChangeAccount = true;
                    accountSelector.store.load();
                },
            });
        },
    },

    tbar: [
        {
            xtype: 'proxmoxButton',
            text: gettext('Add'),
            handler: 'addDomain',
            selModel: false,
        },
        {
            xtype: 'proxmoxButton',
            text: gettext('Edit'),
            disabled: true,
            handler: 'editDomain',
        },
        {
            xtype: 'proxmoxStdRemoveButton',
            handler: 'removeDomain',
        },
        '-',
        'order-menu', // placeholder, filled in initComponent
        '-',
        {
            xtype: 'displayfield',
            value: gettext('Using Account') + ':',
            bind: {
                hidden: '{!accountsAvailable}',
            },
        },
        {
            xtype: 'displayfield',
            reference: 'accounttext',
            renderer: (val) => val || Proxmox.Utils.NoneText,
            bind: {
                value: '{account}',
                hidden: '{accountTextHidden}',
            },
        },
        {
            xtype: 'pmxACMEAccountSelector',
            hidden: true,
            reference: 'accountselector',
            cbind: {
                url: '{accountUrl}',
            },
            bind: {
                value: '{account}',
                hidden: '{accountValueHidden}',
            },
        },
        {
            xtype: 'button',
            iconCls: 'fa black fa-pencil',
            baseCls: 'x-plain',
            userCls: 'pointer',
            bind: {
                iconCls: '{editBtnIcon}',
                hidden: '{!accountsAvailable}',
            },
            handler: 'toggleEditAccount',
        },
        {
            xtype: 'displayfield',
            value: gettext('No Account available.'),
            bind: {
                hidden: '{accountsAvailable}',
            },
        },
        {
            xtype: 'button',
            hidden: true,
            reference: 'accountlink',
            text: gettext('Add ACME Account'),
            bind: {
                hidden: '{accountsAvailable}',
            },
            handler: 'addAccount',
        },
    ],

    updateStore: function (store, records, success) {
        let me = this;
        let data = [];
        let rec;
        if (success && records.length > 0) {
            rec = records[0];
        } else {
            rec = {
                data: {},
            };
        }

        me.nodeconfig = rec.data; // save nodeconfig for updates

        let account = 'default';

        if (rec.data.acme) {
            let obj = Proxmox.Utils.parseACME(rec.data.acme);
            (obj.domains || []).forEach((domain) => {
                if (domain === '') return;
                let record = {
                    domain,
                    type: 'standalone',
                    configkey: 'acme',
                };
                data.push(record);
            });

            if (obj.account) {
                account = obj.account;
            }
        }

        let vm = me.getViewModel();
        let oldaccount = vm.get('account');

        // account changed, and we do not edit currently, load again to verify
        if (oldaccount !== account && !vm.get('accountEditable')) {
            vm.set('configaccount', account);
            me.lookup('accountselector').store.load();
        }

        for (let i = 0; i < Proxmox.Utils.acmedomain_count; i++) {
            let acmedomain = rec.data[`acmedomain${i}`];
            if (!acmedomain) continue;

            let record = Proxmox.Utils.parsePropertyString(acmedomain, 'domain');
            record.type = record.plugin ? 'dns' : 'standalone';
            record.configkey = `acmedomain${i}`;
            data.push(record);
        }

        vm.set('domaincount', data.length);
        me.store.loadData(data, false);
    },

    listeners: {
        itemdblclick: 'editDomain',
    },

    columns: [
        {
            dataIndex: 'domain',
            flex: 5,
            text: gettext('Domain'),
        },
        {
            dataIndex: 'usage',
            flex: 1,
            text: gettext('Usage'),
            bind: {
                hidden: '{!hasUsage}',
            },
        },
        {
            dataIndex: 'type',
            flex: 1,
            text: gettext('Type'),
        },
        {
            dataIndex: 'plugin',
            flex: 1,
            text: gettext('Plugin'),
        },
    ],

    initComponent: function () {
        let me = this;

        if (!me.acmeUrl) {
            throw 'no acmeUrl given';
        }

        if (!me.url) {
            throw 'no url given';
        }

        if (!me.nodename) {
            throw 'no nodename given';
        }

        if (!me.domainUsages && !me.orderUrl) {
            throw 'neither domainUsages nor orderUrl given';
        }

        me.rstore = Ext.create('Proxmox.data.UpdateStore', {
            interval: 10 * 1000,
            autoStart: true,
            storeid: `proxmox-node-domains-${me.nodename}`,
            proxy: {
                type: 'proxmox',
                url: `/api2/json/${me.url}`,
            },
        });

        me.store = Ext.create('Ext.data.Store', {
            model: 'proxmox-acme-domains',
            sorters: 'domain',
        });

        if (me.domainUsages) {
            let items = [];

            for (const cert of me.domainUsages) {
                if (!cert.name) {
                    throw 'missing certificate url';
                }

                if (!cert.url) {
                    throw 'missing certificate url';
                }

                items.push({
                    text: Ext.String.format('Order {0} Certificate Now', cert.name),
                    handler: function () {
                        return me.getController().order(cert);
                    },
                });
            }
            me.tbar.splice(me.tbar.indexOf('order-menu'), 1, {
                text: gettext('Order Certificates Now'),
                menu: {
                    xtype: 'menu',
                    items,
                },
            });
        } else {
            me.tbar.splice(me.tbar.indexOf('order-menu'), 1, {
                xtype: 'button',
                reference: 'order',
                text: gettext('Order Certificates Now'),
                bind: {
                    disabled: '{!canOrder}',
                },
                handler: function () {
                    return me.getController().order();
                },
            });
        }

        me.callParent();
        me.getViewModel().set('hasUsage', !!me.domainUsages);
        me.mon(me.rstore, 'load', 'updateStore', me);
        Proxmox.Utils.monStoreErrors(me, me.rstore);
        me.on('destroy', me.rstore.stopUpdate, me.rstore);
    },
});

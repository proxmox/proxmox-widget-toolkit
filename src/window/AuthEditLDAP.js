Ext.define('Proxmox.panel.LDAPInputPanelViewModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.pmxAuthLDAPPanel',

    data: {
        mode: 'ldap',
        anonymous_search: 1,
    },

    formulas: {
        tls_enabled: function (get) {
            return get('mode') !== 'ldap';
        },
    },
});

Ext.define('Proxmox.panel.LDAPInputPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxAuthLDAPPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    showDefaultRealm: false,

    viewModel: {
        type: 'pmxAuthLDAPPanel',
    },

    type: 'ldap',

    onlineHelp: 'user-realms-ldap',

    onGetValues: function (values) {
        if (this.isCreate && !this.useTypeInUrl) {
            values.type = this.type;
        }

        if (values.anonymous_search && !this.isCreate) {
            if (!values.delete) {
                values.delete = [];
            }

            if (!Array.isArray(values.delete)) {
                let tmp = values.delete;
                values.delete = [];
                values.delete.push(tmp);
            }

            values.delete.push('bind-dn');
            values.delete.push('password');
        }

        delete values.anonymous_search;

        return values;
    },

    onSetValues: function (values) {
        let me = this;
        values.anonymous_search = values['bind-dn'] ? 0 : 1;
        me.getViewModel().set('anonymous_search', values.anonymous_search);

        return values;
    },

    cbindData: function (config) {
        return {
            isLdap: this.type === 'ldap',
            isAd: this.type === 'ad',
        };
    },

    column1: [
        {
            xtype: 'pmxDisplayEditField',
            name: 'realm',
            cbind: {
                value: '{realm}',
                editable: '{isCreate}',
            },
            fieldLabel: gettext('Realm'),
            allowBlank: false,
        },
        {
            xtype: 'proxmoxcheckbox',
            fieldLabel: gettext('Default Realm'),
            name: 'default',
            value: 0,
            cbind: {
                deleteEmpty: '{!isCreate}',
                hidden: '{!showDefaultRealm}',
                disabled: '{!showDefaultRealm}',
            },
            autoEl: {
                tag: 'div',
                'data-qtip': gettext('Set realm as default for login'),
            },
        },
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('Base Domain Name'),
            name: 'base-dn',
            emptyText: 'cn=Users,dc=company,dc=net',
            cbind: {
                hidden: '{!isLdap}',
                allowBlank: '{!isLdap}',
            },
        },
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('User Attribute Name'),
            name: 'user-attr',
            emptyText: 'uid / sAMAccountName',
            cbind: {
                hidden: '{!isLdap}',
                allowBlank: '{!isLdap}',
            },
        },
        {
            xtype: 'proxmoxcheckbox',
            fieldLabel: gettext('Anonymous Search'),
            name: 'anonymous_search',
            bind: {
                value: '{anonymous_search}',
            },
        },
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('Bind Domain Name'),
            name: 'bind-dn',
            allowBlank: false,
            cbind: {
                emptyText: (get) =>
                    get('isAd') ? 'user@company.net' : 'cn=user,dc=company,dc=net',
                autoEl: (get) =>
                    get('isAd')
                        ? {
                              tag: 'div',
                              'data-qtip': gettext(
                                  'LDAP DN syntax can be used as well, e.g. cn=user,dc=company,dc=net',
                              ),
                          }
                        : {},
            },
            bind: {
                disabled: '{anonymous_search}',
            },
        },
        {
            xtype: 'proxmoxtextfield',
            inputType: 'password',
            fieldLabel: gettext('Bind Password'),
            name: 'password',
            cbind: {
                emptyText: (get) => (!get('isCreate') ? gettext('Unchanged') : ''),
                allowBlank: '{!isCreate}',
            },
            bind: {
                disabled: '{anonymous_search}',
            },
        },
    ],

    column2: [
        {
            xtype: 'proxmoxtextfield',
            name: 'server1',
            fieldLabel: gettext('Server'),
            allowBlank: false,
        },
        {
            xtype: 'proxmoxtextfield',
            name: 'server2',
            fieldLabel: gettext('Fallback Server'),
            submitEmpty: false,
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
        {
            xtype: 'proxmoxintegerfield',
            name: 'port',
            fieldLabel: gettext('Port'),
            minValue: 1,
            maxValue: 65535,
            emptyText: gettext('Default'),
            submitEmptyText: false,
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
        {
            xtype: 'proxmoxKVComboBox',
            name: 'mode',
            fieldLabel: gettext('Mode'),
            editable: false,
            comboItems: [
                ['ldap', 'LDAP'],
                ['ldap+starttls', 'STARTTLS'],
                ['ldaps', 'LDAPS'],
            ],
            bind: '{mode}',
            cbind: {
                deleteEmpty: '{!isCreate}',
                value: (get) => (get('isCreate') ? 'ldap' : 'LDAP'),
            },
        },
        {
            xtype: 'proxmoxcheckbox',
            fieldLabel: gettext('Verify Certificate'),
            name: 'verify',
            value: 0,
            cbind: {
                deleteEmpty: '{!isCreate}',
            },

            bind: {
                disabled: '{!tls_enabled}',
            },
            autoEl: {
                tag: 'div',
                'data-qtip': gettext('Verify TLS certificate of the server'),
            },
        },
    ],

    columnB: [
        {
            xtype: 'proxmoxtextfield',
            name: 'comment',
            fieldLabel: gettext('Comment'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
    ],
});

Ext.define('Proxmox.panel.LDAPSyncInputPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxAuthLDAPSyncPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    editableAttributes: ['firstname', 'lastname', 'email'],
    editableDefaults: ['scope', 'enable-new'],
    default_opts: {},
    sync_attributes: {},

    type: 'ldap',

    // (de)construct the sync-attributes from the list above,
    // not touching all others
    onGetValues: function (values) {
        let me = this;

        me.editableDefaults.forEach((attr) => {
            if (values[attr]) {
                me.default_opts[attr] = values[attr];
                delete values[attr];
            } else {
                delete me.default_opts[attr];
            }
        });
        let vanished_opts = [];
        ['acl', 'entry', 'properties'].forEach((prop) => {
            if (values[`remove-vanished-${prop}`]) {
                vanished_opts.push(prop);
            }
            delete values[`remove-vanished-${prop}`];
        });
        me.default_opts['remove-vanished'] = vanished_opts.join(';');

        values['sync-defaults-options'] = Proxmox.Utils.printPropertyString(me.default_opts);
        me.editableAttributes.forEach((attr) => {
            if (values[attr]) {
                me.sync_attributes[attr] = values[attr];
                delete values[attr];
            } else {
                delete me.sync_attributes[attr];
            }
        });
        values['sync-attributes'] = Proxmox.Utils.printPropertyString(me.sync_attributes);

        Proxmox.Utils.delete_if_default(values, 'sync-defaults-options');
        Proxmox.Utils.delete_if_default(values, 'sync-attributes');

        // Force values.delete to be an array
        if (typeof values.delete === 'string') {
            values.delete = values.delete.split(',');
        }

        if (me.isCreate) {
            delete values.delete; // on create we cannot delete values
        }

        return values;
    },

    setValues: function (values) {
        let me = this;

        if (values['sync-attributes']) {
            me.sync_attributes = Proxmox.Utils.parsePropertyString(values['sync-attributes']);
            delete values['sync-attributes'];
            me.editableAttributes.forEach((attr) => {
                if (me.sync_attributes[attr]) {
                    values[attr] = me.sync_attributes[attr];
                }
            });
        }
        if (values['sync-defaults-options']) {
            me.default_opts = Proxmox.Utils.parsePropertyString(values['sync-defaults-options']);
            delete values.default_opts;
            me.editableDefaults.forEach((attr) => {
                if (me.default_opts[attr]) {
                    values[attr] = me.default_opts[attr];
                }
            });

            if (me.default_opts['remove-vanished']) {
                let opts = me.default_opts['remove-vanished'].split(';');
                for (const opt of opts) {
                    values[`remove-vanished-${opt}`] = 1;
                }
            }
        }
        return me.callParent([values]);
    },

    column1: [
        {
            xtype: 'proxmoxtextfield',
            name: 'firstname',
            fieldLabel: gettext('First Name attribute'),
            autoEl: {
                tag: 'div',
                'data-qtip': Ext.String.format(gettext('Often called {0}'), '`givenName`'),
            },
        },
        {
            xtype: 'proxmoxtextfield',
            name: 'lastname',
            fieldLabel: gettext('Last Name attribute'),
            autoEl: {
                tag: 'div',
                'data-qtip': Ext.String.format(gettext('Often called {0}'), '`sn`'),
            },
        },
        {
            xtype: 'proxmoxtextfield',
            name: 'email',
            fieldLabel: gettext('E-Mail attribute'),
            autoEl: {
                tag: 'div',
                'data-qtip': (get) =>
                    get('isAd')
                        ? Ext.String.format(
                              gettext('Often called {0} or {1}'),
                              '`userPrincipalName`',
                              '`mail`',
                          )
                        : Ext.String.format(gettext('Often called {0}'), '`mail`'),
            },
        },
        {
            xtype: 'displayfield',
            value: gettext('Default Sync Options'),
        },
        {
            xtype: 'proxmoxKVComboBox',
            value: '__default__',
            deleteEmpty: false,
            comboItems: [
                [
                    '__default__',
                    Ext.String.format(
                        gettext('{0} ({1})'),
                        Proxmox.Utils.yesText,
                        Proxmox.Utils.defaultText,
                    ),
                ],
                ['true', Proxmox.Utils.yesText],
                ['false', Proxmox.Utils.noText],
            ],
            name: 'enable-new',
            fieldLabel: gettext('Enable new users'),
        },
    ],

    column2: [
        {
            xtype: 'proxmoxtextfield',
            name: 'user-classes',
            fieldLabel: gettext('User classes'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
            emptyText: 'inetorgperson, posixaccount, person, user',
            autoEl: {
                tag: 'div',
                'data-qtip': gettext(
                    'Default user classes: inetorgperson, posixaccount, person, user',
                ),
            },
        },
        {
            xtype: 'proxmoxtextfield',
            name: 'filter',
            fieldLabel: gettext('User Filter'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
    ],

    columnB: [
        {
            xtype: 'fieldset',
            title: gettext('Remove Vanished Options'),
            items: [
                {
                    xtype: 'proxmoxcheckbox',
                    fieldLabel: gettext('ACL'),
                    name: 'remove-vanished-acl',
                    boxLabel: gettext('Remove ACLs of vanished users'),
                },
                {
                    xtype: 'proxmoxcheckbox',
                    fieldLabel: gettext('Entry'),
                    name: 'remove-vanished-entry',
                    boxLabel: gettext('Remove vanished user'),
                },
                {
                    xtype: 'proxmoxcheckbox',
                    fieldLabel: gettext('Properties'),
                    name: 'remove-vanished-properties',
                    boxLabel: gettext('Remove vanished properties from synced users.'),
                },
            ],
        },
    ],
});

Ext.define('Proxmox.panel.SmtpEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxSmtpEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],
    onlineHelp: 'notification_targets_smtp',

    type: 'smtp',

    viewModel: {
        xtype: 'viewmodel',
        data: {
            mode: 'tls',
            authentication: true,
            originalAuthentication: true,
        },
        formulas: {
            portEmptyText: function (get) {
                let port;

                switch (get('mode')) {
                    case 'insecure':
                        port = 25;
                        break;
                    case 'starttls':
                        port = 587;
                        break;
                    case 'tls':
                        port = 465;
                        break;
                }
                return `${Proxmox.Utils.defaultText} (${port})`;
            },
            passwordEmptyText: function (get) {
                let isCreate = this.getView().isCreate;

                let auth = get('authentication');
                let origAuth = get('originalAuthentication');
                let shouldShowUnchanged = !isCreate && auth && origAuth;

                return shouldShowUnchanged ? gettext('Unchanged') : '';
            },
        },
    },

    columnT: [
        {
            xtype: 'pmxDisplayEditField',
            name: 'name',
            cbind: {
                value: '{name}',
                editable: '{isCreate}',
            },
            fieldLabel: gettext('Endpoint Name'),
            allowBlank: false,
        },
        {
            xtype: 'proxmoxcheckbox',
            name: 'enable',
            fieldLabel: gettext('Enable'),
            allowBlank: false,
            checked: true,
        },
    ],

    column1: [
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('Server'),
            name: 'server',
            allowBlank: false,
            emptyText: gettext('mail.example.com'),
        },
        {
            xtype: 'proxmoxKVComboBox',
            name: 'mode',
            fieldLabel: gettext('Encryption'),
            editable: false,
            comboItems: [
                ['insecure', gettext('None (insecure)')],
                ['starttls', 'STARTTLS'],
                ['tls', 'TLS'],
            ],
            bind: '{mode}',
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
            bind: {
                emptyText: '{portEmptyText}',
            },
            submitEmptyText: false,
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
    ],
    column2: [
        {
            xtype: 'proxmoxcheckbox',
            fieldLabel: gettext('Authenticate'),
            name: 'authentication',
            bind: {
                value: '{authentication}',
            },
        },
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('Username'),
            name: 'username',
            allowBlank: false,
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
            bind: {
                disabled: '{!authentication}',
            },
        },
        {
            xtype: 'proxmoxtextfield',
            inputType: 'password',
            fieldLabel: gettext('Password'),
            name: 'password',
            cbind: {
                allowBlank: '{!isCreate}',
            },
            bind: {
                disabled: '{!authentication}',
                emptyText: '{passwordEmptyText}',
            },
        },
    ],
    columnB: [
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('From Address'),
            name: 'from-address',
            allowBlank: false,
            emptyText: gettext('user@example.com'),
        },
        {
            // provides 'mailto' and 'mailto-user' fields
            xtype: 'pmxEmailRecipientPanel',
            cbind: {
                isCreate: '{isCreate}',
            },
        },
        {
            xtype: 'proxmoxtextfield',
            name: 'comment',
            fieldLabel: gettext('Comment'),
            cbind: {
                deleteEmpty: '{!isCreate}',
            },
        },
    ],

    advancedColumnB: [
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('Author'),
            name: 'author',
            allowBlank: true,
            cbind: {
                emptyText: '{defaultMailAuthor}',
                deleteEmpty: '{!isCreate}',
            },
        },
    ],

    onGetValues: function (values) {
        let me = this;

        if (values.mailto) {
            values.mailto = values.mailto.split(/[\s,;]+/);
        }

        if (!values.authentication && !me.isCreate) {
            Proxmox.Utils.assemble_field_data(values, { delete: 'username' });
            Proxmox.Utils.assemble_field_data(values, { delete: 'password' });
        }

        if (values.enable) {
            if (!me.isCreate) {
                Proxmox.Utils.assemble_field_data(values, { delete: 'disable' });
            }
        } else {
            values.disable = 1;
        }

        delete values.enable;

        delete values.authentication;

        return values;
    },

    onSetValues: function (values) {
        let me = this;

        values.authentication = !!values.username;
        values.enable = !values.disable;
        delete values.disable;

        // Fix race condition in chromium-based browsers. Without this, the
        // 'Authenticate' remains ticked (the default value) if loading an
        // SMTP target without authentication.
        me.getViewModel().set('authentication', values.authentication);
        me.getViewModel().set('originalAuthentication', values.authentication);

        return values;
    },
});

Ext.define('Proxmox.panel.GotifyEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxGotifyEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],
    onlineHelp: 'notification_targets_gotify',

    type: 'gotify',

    items: [
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
        {
            xtype: 'proxmoxtextfield',
            fieldLabel: gettext('Server URL'),
            name: 'server',
            allowBlank: false,
        },
        {
            xtype: 'proxmoxtextfield',
            inputType: 'password',
            fieldLabel: gettext('API Token'),
            name: 'token',
            cbind: {
                emptyText: (get) => (!get('isCreate') ? gettext('Unchanged') : ''),
                allowBlank: '{!isCreate}',
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

    onSetValues: (values) => {
        values.enable = !values.disable;

        delete values.disable;
        return values;
    },

    onGetValues: function (values) {
        let me = this;

        if (values.enable) {
            if (!me.isCreate) {
                Proxmox.Utils.assemble_field_data(values, { delete: 'disable' });
            }
        } else {
            values.disable = 1;
        }

        delete values.enable;

        return values;
    },
});

// treats 0 as "never expires"
Ext.define('Proxmox.form.field.ExpireDate', {
    extend: 'Ext.form.field.Date',
    alias: ['widget.pmxExpireDate'],

    name: 'expire',
    fieldLabel: gettext('Expire'),
    emptyText: 'never',
    format: 'Y-m-d',
    submitFormat: 'U',

    getSubmitValue: function () {
        let me = this;

        let value = me.callParent();
        if (!value) {
            value = 0;
        }

        return value;
    },

    setValue: function (value) {
        let me = this;

        if (Ext.isDefined(value)) {
            if (!value) {
                value = null;
            } else if (!Ext.isDate(value)) {
                value = new Date(value * 1000);
            }
        }
        me.callParent([value]);
    },
});

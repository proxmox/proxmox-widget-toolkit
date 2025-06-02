Ext.define('Proxmox.form.field.Base64TextArea', {
    extend: 'Ext.form.field.TextArea',
    alias: ['widget.proxmoxBase64TextArea'],

    config: {
        skipEmptyText: false,
        deleteEmpty: false,
        trimValue: false,
        editable: true,
        width: 600,
        height: 400,
        scrollable: 'y',
        emptyText: gettext('You can use Markdown for rich text formatting.'),
    },

    setValue: function (value) {
        // We want to edit the decoded version of the text
        this.callParent([Proxmox.Utils.base64ToUtf8(value)]);
    },

    processRawValue: function (value) {
        // The field could contain multi-line values
        return Proxmox.Utils.utf8ToBase64(value);
    },

    getSubmitData: function () {
        let me = this,
            data = null,
            val;
        if (!me.disabled && me.submitValue && !me.isFileUpload()) {
            val = me.getSubmitValue();
            if (val !== null) {
                data = {};
                data[me.getName()] = val;
            } else if (me.getDeleteEmpty()) {
                data = {};
                data.delete = me.getName();
            }
        }
        return data;
    },

    getSubmitValue: function () {
        let me = this;

        let value = this.processRawValue(this.getRawValue());
        if (me.getTrimValue() && typeof value === 'string') {
            value = value.trim();
        }
        if (value !== '') {
            return value;
        }

        return me.getSkipEmptyText() ? null : value;
    },

    setAllowBlank: function (allowBlank) {
        this.allowBlank = allowBlank;
        this.validate();
    },
});

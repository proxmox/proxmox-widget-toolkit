Ext.define('Proxmox.DateTimeField', {
    extend: 'Ext.form.FieldContainer',
    xtype: 'promxoxDateTimeField',

    layout: 'hbox',

    referenceHolder: true,

    submitFormat: 'U',

    getValue: function() {
	var me = this;
	var d = me.lookupReference('dateentry').getValue();

	if (d === undefined || d === null) { return null; }

	var t = me.lookupReference('timeentry').getValue();

	if (t === undefined || t === null) { return null; }

	var offset = (t.getHours()*3600+t.getMinutes()*60)*1000;

	return new Date(d.getTime() + offset);
    },

    getSubmitValue: function() {
        var me = this;
        var format = me.submitFormat;
        var value = me.getValue();

        return value ? Ext.Date.format(value, format) : null;
    },

    items: [
	{
	    xtype: 'datefield',
	    editable: false,
	    reference: 'dateentry',
	    flex: 1,
	    format: 'Y-m-d'
	},
	{
	    xtype: 'timefield',
	    reference: 'timeentry',
	    format: 'H:i',
	    width: 80,
	    value: '00:00',
	    increment: 60
	}
    ],

    initComponent: function() {
	var me = this;

	me.callParent();

	var value = me.value || new Date();

	me.lookupReference('dateentry').setValue(value);
	me.lookupReference('timeentry').setValue(value);
    }
});

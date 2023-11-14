Ext.define('Proxmox.panel.SendmailEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxSendmailEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    type: 'sendmail',

    mailValidator: function() {
	let mailto_user = this.down(`[name=mailto-user]`);
	let mailto = this.down(`[name=mailto]`);

	if (!mailto_user.getValue()?.length && !mailto.getValue()) {
	    return gettext('Either mailto or mailto-user must be set');
	}

	return true;
    },

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
	    xtype: 'pmxUserSelector',
	    name: 'mailto-user',
	    reference: 'mailto-user',
	    multiSelect: true,
	    allowBlank: true,
	    editable: false,
	    skipEmptyText: true,
	    fieldLabel: gettext('User(s)'),
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	    validator: function() {
		return this.up('pmxSendmailEditPanel').mailValidator();
	    },
	    listConfig: {
		width: 600,
		columns: [
		    {
			header: gettext('User'),
			sortable: true,
			dataIndex: 'userid',
			renderer: Ext.String.htmlEncode,
			flex: 1,
		    },
		    {
			header: gettext('E-Mail'),
			sortable: true,
			dataIndex: 'email',
			renderer: Ext.String.htmlEncode,
			flex: 1,
		    },
		    {
			header: gettext('Comment'),
			sortable: false,
			dataIndex: 'comment',
			renderer: Ext.String.htmlEncode,
			flex: 1,
		    },
		],
	    },
	},
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('Additional Recipient(s)'),
	    name: 'mailto',
	    reference: 'mailto',
	    allowBlank: true,
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	    autoEl: {
		tag: 'div',
		'data-qtip': gettext('Multiple recipients must be separated by spaces, commas or semicolons'),
	    },
	    validator: function() {
		return this.up('pmxSendmailEditPanel').mailValidator();
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

    advancedItems: [
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('Author'),
	    name: 'author',
	    allowBlank: true,
	    emptyText: 'Proxmox VE',
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	},
	{
	    xtype: 'proxmoxtextfield',
	    fieldLabel: gettext('From Address'),
	    name: 'from-address',
	    allowBlank: true,
	    emptyText: gettext('Defaults to datacenter configuration, or root@$hostname'),
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	},
    ],

    onGetValues: (values) => {
	if (values.mailto) {
	    values.mailto = values.mailto.split(/[\s,;]+/);
	}
	return values;
    },
});

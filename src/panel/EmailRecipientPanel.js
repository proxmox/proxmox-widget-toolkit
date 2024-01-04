Ext.define('Proxmox.panel.EmailRecipientPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'pmxEmailRecipientPanel',
    mixins: ['Proxmox.Mixin.CBind'],
    border: false,

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
	    layout: 'anchor',
	    border: false,
	    cbind: {
		isCreate: '{isCreate}',
	    },
	    items: [
		{
		    xtype: 'pmxUserSelector',
		    name: 'mailto-user',
		    multiSelect: true,
		    allowBlank: true,
		    editable: false,
		    skipEmptyText: true,
		    fieldLabel: gettext('Recipient(s)'),
		    cbind: {
			deleteEmpty: '{!isCreate}',
		    },
		    validator: function() {
			return this.up('pmxEmailRecipientPanel').mailValidator();
		    },
		    autoEl: {
			tag: 'div',
			'data-qtip': gettext('The notification will be sent to the user\'s configured mail address'),
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
		    allowBlank: true,
		    emptyText: 'user@example.com, ...',
		    cbind: {
			deleteEmpty: '{!isCreate}',
		    },
		    autoEl: {
			tag: 'div',
			'data-qtip': gettext('Multiple recipients must be separated by spaces, commas or semicolons'),
		    },
		    validator: function() {
			return this.up('pmxEmailRecipientPanel').mailValidator();
		    },
		},
	    ],
	},
    ],
});

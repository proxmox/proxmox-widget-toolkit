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

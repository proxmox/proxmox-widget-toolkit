Ext.define('Proxmox.panel.NotificationConfigView', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.pmxNotificationConfigView',
    mixins: ['Proxmox.Mixin.CBind'],
    layout: {
	type: 'border',
    },

    items: [
	{
	    region: 'center',
	    border: false,
	    xtype: 'pmxNotificationEndpointView',
	    cbind: {
		baseUrl: '{baseUrl}',
	    },
	},
    ],
});

Ext.define('Proxmox.panel.NotificationEndpointView', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pmxNotificationEndpointView',

    title: gettext('Notification Targets'),

    controller: {
	xclass: 'Ext.app.ViewController',

	openEditWindow: function(endpointType, endpoint) {
	    let me = this;

	    if (endpoint === 'mail-to-root') {
		return;
	    }

	    Ext.create('Proxmox.window.EndpointEditBase', {
		baseUrl: me.getView().baseUrl,
		type: endpointType,

		name: endpoint,
		autoShow: true,
		listeners: {
		    destroy: () => me.reload(),
		},
	    });
	},

	openEditForSelectedItem: function() {
	    let me = this;
	    let view = me.getView();

	    let selection = view.getSelection();
	    if (selection.length < 1) {
		return;
	    }

	    me.openEditWindow(selection[0].data.type, selection[0].data.name);
	},

	reload: function() {
	    let me = this;
	    let view = me.getView();
	    view.getStore().rstore.load();
	},

	testEndpoint: function() {
	    let me = this;
	    let view = me.getView();

	    let selection = view.getSelection();
	    if (selection.length < 1) {
		return;
	    }

	    let target = selection[0].data.name;

	    Ext.Msg.confirm(
		gettext("Notification Target Test"),
		gettext(`Do you want to send a test notification to '${target}'?`),
		function(decision) {
		    if (decision !== "yes") {
			return;
		    }

		    Proxmox.Utils.API2Request({
			method: 'POST',
			url: `${view.baseUrl}/targets/${target}/test`,

			success: function(response, opt) {
			    Ext.Msg.show({
				title: gettext('Notification Target Test'),
				message: gettext(`Sent test notification to '${target}'.`),
				buttons: Ext.Msg.OK,
				icon: Ext.Msg.INFO,
			    });
			},
			autoErrorAlert: true,
		    });
	    });
	},
    },

    listeners: {
	itemdblclick: 'openEditForSelectedItem',
	activate: 'reload',
    },

    emptyText: gettext('No notification targets configured'),

    columns: [
	{
	    dataIndex: 'name',
	    text: gettext('Target Name'),
	    renderer: Ext.String.htmlEncode,
	    flex: 1,
	},
	{
	    dataIndex: 'type',
	    text: gettext('Type'),
	    renderer: Ext.String.htmlEncode,
	    flex: 1,
	},
	{
	    dataIndex: 'comment',
	    text: gettext('Comment'),
	    renderer: Ext.String.htmlEncode,
	    flex: 1,
	},
    ],

    store: {
	type: 'diff',
	autoDestroy: true,
	autoDestroyRstore: true,
	rstore: {
	    type: 'update',
	    storeid: 'proxmox-notification-endpoints',
	    model: 'proxmox-notification-endpoints',
	    autoStart: true,
	},
	sorters: 'name',
    },

    initComponent: function() {
	let me = this;

	let menuItems = [];
	for (const [endpointType, config] of Object.entries(
	    Proxmox.Schema.notificationEndpointTypes).sort()) {
	    menuItems.push({
		text: config.name,
		iconCls: 'fa fa-fw ' + (config.iconCls || 'fa-bell-o'),
		handler: () => me.controller.openEditWindow(endpointType),
	    });
	}

	Ext.apply(me, {
	    tbar: [
		{
		    text: gettext('Add'),
		    menu: menuItems,
		},
		{
		    xtype: 'proxmoxButton',
		    text: gettext('Modify'),
		    handler: 'openEditForSelectedItem',
		    enableFn: rec => rec.data.name !== 'mail-to-root',
		    disabled: true,
		},
		{
		    xtype: 'proxmoxStdRemoveButton',
		    callback: 'reload',
		    enableFn: rec => rec.data.name !== 'mail-to-root',
		    getUrl: function(rec) {
			if (rec.data.type === 'group') {
			    return `${me.baseUrl}/groups/${rec.getId()}`;
			}

			return `${me.baseUrl}/endpoints/${rec.data.type}/${rec.getId()}`;
		    },
		},
		'-',
		{
		    xtype: 'proxmoxButton',
		    text: gettext('Test'),
		    handler: 'testEndpoint',
		    disabled: true,
		},
	    ],
	});

	me.callParent();
	me.store.rstore.proxy.setUrl(`/api2/json/${me.baseUrl}/targets`);
    },
});

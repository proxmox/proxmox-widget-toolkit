Ext.define('Proxmox.panel.AuthView', {
    extend: 'Ext.grid.GridPanel',

    alias: 'widget.pmxAuthView',

    stateful: true,
    stateId: 'grid-authrealms',

    viewConfig: {
	trackOver: false,
    },

    baseUrl: '/access/domains',

    columns: [
	{
	    header: gettext('Realm'),
	    width: 100,
	    sortable: true,
	    dataIndex: 'realm',
	},
	{
	    header: gettext('Type'),
	    width: 100,
	    sortable: true,
	    dataIndex: 'type',
	},
	{
	    header: gettext('Comment'),
	    sortable: false,
	    dataIndex: 'comment',
	    renderer: Ext.String.htmlEncode,
	    flex: 1,
	},
    ],

    store: {
	model: 'pmx-domains',
	sorters: {
	    property: 'realm',
	    direction: 'ASC',
	},
    },

    openEditWindow: function(authType, realm) {
	let me = this;
	const { useTypeInUrl } = Proxmox.Schema.authDomains[authType];

	Ext.create('Proxmox.window.AuthEditBase', {
	    baseUrl: me.baseUrl,
	    useTypeInUrl,
	    authType,
	    realm,
	    listeners: {
		destroy: () => me.reload(),
	    },
	}).show();
    },

    reload: function() {
	let me = this;
	me.getStore().load();
    },

    run_editor: function() {
	let me = this;
	let rec = me.getSelection()[0];
	if (!rec) {
	    return;
	}

	if (!Proxmox.Schema.authDomains[rec.data.type].edit) {
	    return;
	}

	me.openEditWindow(rec.data.type, rec.data.realm);
    },

    open_sync_window: function() {
	let rec = this.getSelection()[0];
	if (!rec) {
	    return;
	}
	if (!Proxmox.Schema.authDomains[rec.data.type].sync) {
	    return;
	}
	Ext.create('Proxmox.window.SyncWindow', {
	    type: rec.data.type,
	    realm: rec.data.realm,
	    listeners: {
		destroy: () => this.reload(),
	    },
	}).show();
    },

    initComponent: function() {
	var me = this;

	let menuitems = [];
	for (const [authType, config] of Object.entries(Proxmox.Schema.authDomains).sort()) {
	    if (!config.add) { continue; }
	    menuitems.push({
		text: config.name,
		iconCls: 'fa fa-fw ' + (config.iconCls || 'fa-address-book-o'),
		handler: () => me.openEditWindow(authType),
	    });
	}

	let tbar = [
	    {
		text: gettext('Add'),
		menu: {
		    items: menuitems,
		},
	    },
	    {
		xtype: 'proxmoxButton',
		text: gettext('Edit'),
		disabled: true,
		enableFn: (rec) => Proxmox.Schema.authDomains[rec.data.type].edit,
		handler: () => me.run_editor(),
	    },
	    {
		xtype: 'proxmoxStdRemoveButton',
		getUrl: (rec) => {
		    let url = me.baseUrl;
		    if (Proxmox.Schema.authDomains[rec.data.type].useTypeInUrl) {
			url += `/${rec.get('type')}`;
		    }
		    url += `/${rec.getId()}`;
		    return url;
		},
		enableFn: (rec) => Proxmox.Schema.authDomains[rec.data.type].add,
		callback: () => me.reload(),
	    },
	    {
		xtype: 'proxmoxButton',
		text: gettext('Sync'),
		disabled: true,
		enableFn: (rec) => Proxmox.Schema.authDomains[rec.data.type].sync,
		handler: () => me.open_sync_window(),
	    },
	];

	if (me.extraButtons) {
	    tbar.push('-');
	    for (const button of me.extraButtons) {
		tbar.push(button);
	    }
	}

	Ext.apply(me, {
	    tbar,
	    listeners: {
		activate: () => me.reload(),
		itemdblclick: () => me.run_editor(),
	    },
	});

	me.callParent();
    },
});

Ext.define('Proxmox.panel.NotesView', {
    extend: 'Ext.panel.Panel',
    xtype: 'pmxNotesView',
    mixins: ['Proxmox.Mixin.CBind'],

    title: gettext("Notes"),
    bodyPadding: 10,
    scrollable: true,
    animCollapse: false,
    collapseFirst: false,

    maxLength: 64 * 1024,
    enableTBar: false,
    onlineHelp: 'markdown_basics',

    tbar: {
	itemId: 'tbar',
	hidden: true,
	items: [
	    {
		text: gettext('Edit'),
		handler: function() {
		    let view = this.up('panel');
		    view.run_editor();
		},
	    },
	],
    },

    cbindData: function(initalConfig) {
	let me = this;
	let type = '';

	if (me.node) {
	    me.url = `/api2/extjs/nodes/${me.node}/config`;
	} else if (me.pveSelNode?.data?.id === 'root') {
	    me.url = '/api2/extjs/cluster/options';
	    type = me.pveSelNode?.data?.type;
	} else {
	    const nodename = me.pveSelNode?.data?.node;
	    type = me.pveSelNode?.data?.type;

	    if (!nodename) {
		throw "no node name specified";
	    }

	    if (!Ext.Array.contains(['node', 'qemu', 'lxc'], type)) {
		throw 'invalid type specified';
	    }

	    const vmid = me.pveSelNode?.data?.vmid;

	    if (!vmid && type !== 'node') {
		throw "no VM ID specified";
	    }

	    me.url = `/api2/extjs/nodes/${nodename}/`;

	    // add the type specific path if qemu/lxc and set the backend's maxLen
	    if (type === 'qemu' || type === 'lxc') {
		me.url += `${type}/${vmid}/`;
		me.maxLength = 8 * 1024;
	    }

	    me.url += 'config';
	}

	me.pveType = type;

	me.load();
	return {};
    },

    run_editor: function() {
	let me = this;
	Ext.create('Proxmox.window.NotesEdit', {
	    url: me.url,
	    onlineHelp: me.onlineHelp,
	    listeners: {
		destroy: () => me.load(),
	    },
	    autoShow: true,
	}).setMaxLength(me.maxLength);
    },

    setNotes: function(value = '') {
	let me = this;

	let mdHtml = Proxmox.Markdown.parse(value);
	me.update(mdHtml);

	if (me.collapsible && me.collapseMode === 'auto') {
	    me.setCollapsed(!value);
	}
    },

    load: function() {
	let me = this;

	Proxmox.Utils.API2Request({
	    url: me.url,
	    waitMsgTarget: me,
	    failure: (response, opts) => {
		me.update(gettext('Error') + " " + response.htmlStatus);
		me.setCollapsed(false);
	    },
	    success: ({ result }) => me.setNotes(result.data.description),
	});
    },

    listeners: {
	render: function(c) {
	    let me = this;
	    me.getEl().on('dblclick', me.run_editor, me);
	},
	afterlayout: function() {
	    let me = this;
	    if (me.collapsible && !me.getCollapsed() && me.collapseMode === 'always') {
		me.setCollapsed(true);
		me.collapseMode = ''; // only once, on initial load!
	    }
	},
    },

    tools: [
	{
	    type: 'gear',
	    handler: function() {
		let view = this.up('panel');
		view.run_editor();
	    },
	},
    ],

    initComponent: function() {
	let me = this;
	me.callParent();

	// '' is for datacenter
	if (me.enableTBar === true || me.pveType === 'node' || me.pveType === '') {
	    me.down('#tbar').setVisible(true);
	} else if (me.pveSelNode?.data?.template !== 1) {
	    me.setCollapsible(true);
	    me.collapseDirection = 'right';

	    let sp = Ext.state.Manager.getProvider();
	    me.collapseMode = sp.get('guest-notes-collapse', 'never');

	    if (me.collapseMode === 'auto') {
		me.setCollapsed(true);
	    }
	}
    },
});

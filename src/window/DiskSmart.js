Ext.define('Proxmox.window.DiskSmart', {
    extend: 'Ext.window.Window',
    alias: 'widget.pmxSmartWindow',

    modal: true,

    layout: {
	type: 'fit',
    },
    width: 800,
    height: 500,
    minWidth: 400,
    minHeight: 300,
    bodyPadding: 5,
    title: gettext('S.M.A.R.T. Values'),

    items: [
	{
	    xtype: 'gridpanel',
	    layout: {
		type: 'fit',
	    },
	    emptyText: gettext('No S.M.A.R.T. Values'),
	    scrollable: true,
	    flex: 1,
	    itemId: 'smarts',
	    reserveScrollbar: true,
	    columns: [
		{
		    text: 'ID',
		    dataIndex: 'id',
		    width: 50,
		},
		{
		    text: gettext('Attribute'),
		    dataIndex: 'name',
		    flex: 1,
		    renderer: Ext.String.htmlEncode,
		},
		{
		    text: gettext('Value'),
		    dataIndex: 'raw',
		    renderer: Ext.String.htmlEncode,
		},
		{
		    text: gettext('Normalized'),
		    dataIndex: 'value',
		    width: 60,
		},
		{
		    text: gettext('Threshold'),
		    dataIndex: 'threshold',
		    width: 60,
		},
		{
		    text: gettext('Worst'),
		    dataIndex: 'worst',
		    width: 60,
		},
		{
		    text: gettext('Flags'),
		    dataIndex: 'flags',
		},
		{
		    text: gettext('Failing'),
		    dataIndex: 'fail',
		    renderer: Ext.String.htmlEncode,
		},
	    ],
	},
	{
	    xtype: 'component',
	    itemId: 'text',
	    hidden: true,
	    autoScroll: true,
	    padding: 5,
	    style: {
		'background-color': 'white',
		'white-space': 'pre',
		'font-family': 'monospace',
	    },
	},
    ],

    buttons: [
	{
	    text: gettext('Reload'),
	    name: 'reload',
	    handler: function() {
		var me = this;
		me.up('window').store.reload();
	    },
	},
	{
	    text: gettext('Close'),
	    name: 'close',
	    handler: function() {
		var me = this;
		me.up('window').close();
	    },
	},
    ],

    initComponent: function() {
	var me = this;

	if (!me.baseurl) {
	    throw "no baseurl specified";
	}

	var dev = me.dev;
	if (!dev) {
	    throw "no device specified";
	}

	me.store = Ext.create('Ext.data.Store', {
	    model: 'pmx-disk-smart',
	    proxy: {
                type: 'proxmox',
		url: `${me.baseurl}/smart?disk=${dev}`,
	    },
	});

	me.callParent();

	let grid = me.down('#smarts');

	Proxmox.Utils.monStoreErrors(grid, me.store);
	me.mon(me.store, 'load', function(s, records, success) {
	    if (success && records.length > 0) {
		let rec = records[0];
		if (rec.data.type === 'text') {
		    grid.setVisible(false);

		    me.down('#text').setHtml(Ext.String.htmlEncode(rec.data.text));
		    me.down('#text').setVisible(true);
		} else {
		    grid.setVisible(true);
		    me.down('#textContainer').setVisible(false);
		    grid.setStore(rec.attributes());
		}
	    }
	});

	me.store.load();
    },
}, function() {
    Ext.define('pmx-disk-smart', {
	extend: 'Ext.data.Model',
	fields: [
	    { name: 'health' },
	    { name: 'type' },
	    { name: 'text' },
	],
	hasMany: { model: 'pmx-smart-attribute', name: 'attributes' },
    });
    Ext.define('pmx-smart-attribute', {
	extend: 'Ext.data.Model',
	fields: [
	    { name: 'id', type: 'number' }, 'name', 'value', 'worst', 'threshold', 'flags', 'fail', 'raw',
	],
	idProperty: 'name',
    });
});

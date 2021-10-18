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

    items: [
	{
	    xtype: 'gridpanel',
	    layout: {
		type: 'fit',
	    },
	    emptyText: gettext('No S.M.A.R.T. Values'),
	    scrollable: true,
	    flex: 1,
	    itemId: 'smartGrid',
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
	    itemId: 'smartPlainText',
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
	let me = this;

	if (!me.baseurl) {
	    throw "no baseurl specified";
	}
	if (!me.dev) {
	    throw "no device specified";
	}

	me.title = `${gettext('S.M.A.R.T. Values')} (${me.dev})`;

	me.store = Ext.create('Ext.data.Store', {
	    model: 'pmx-disk-smart',
	    proxy: {
                type: 'proxmox',
		url: `${me.baseurl}/smart?disk=${me.dev}`,
	    },
	});

	me.callParent();

	let grid = me.down('#smartGrid'), plainText = me.down('#smartPlainText');

	Proxmox.Utils.monStoreErrors(grid, me.store);
	me.mon(me.store, 'load', function(_store, records, success) {
	    if (!success || records.length <= 0) {
		return; // FIXME: clear displayed info?
	    }
	    let isPlainText = records[0].data.type === 'text';
	    if (isPlainText) {
		plainText.setHtml(Ext.String.htmlEncode(records[0].data.text));
	    } else {
		grid.setStore(records[0].attributes());
	    }
	    grid.setVisible(!isPlainText);
	    plainText.setVisible(isPlainText);
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

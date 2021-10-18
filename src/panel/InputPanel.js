Ext.define('Proxmox.panel.InputPanel', {
    extend: 'Ext.panel.Panel',
    alias: ['widget.inputpanel'],
    listeners: {
	activate: function() {
	    // notify owning container that it should display a help button
	    if (this.onlineHelp) {
		Ext.GlobalEvents.fireEvent('proxmoxShowHelp', this.onlineHelp);
	    }
	},
	deactivate: function() {
	    if (this.onlineHelp) {
		Ext.GlobalEvents.fireEvent('proxmoxHideHelp', this.onlineHelp);
	    }
	},
    },
    border: false,

    // override this with an URL to a relevant chapter of the pve manual
    // setting this will display a help button in our parent panel
    onlineHelp: undefined,

    // will be set if the inputpanel has advanced items
    hasAdvanced: false,

    // if the panel has advanced items, this will determine if they are shown by default
    showAdvanced: false,

    // overwrite this to modify submit data
    onGetValues: function(values) {
	return values;
    },

    getValues: function(dirtyOnly) {
	let me = this;

	if (Ext.isFunction(me.onGetValues)) {
	    dirtyOnly = false;
	}

	let values = {};

	Ext.Array.each(me.query('[isFormField]'), function(field) {
	    if (!dirtyOnly || field.isDirty()) {
		Proxmox.Utils.assemble_field_data(values, field.getSubmitData());
	    }
	});

	return me.onGetValues(values);
    },

    setAdvancedVisible: function(visible) {
	let me = this;
	let advItems = me.getComponent('advancedContainer');
	if (advItems) {
	    advItems.setVisible(visible);
	}
    },

    setValues: function(values) {
	let me = this;

	let form = me.up('form');

        Ext.iterate(values, function(fieldId, val) {
	    let fields = me.query('[isFormField][name=' + fieldId + ']');
	    for (const field of fields) {
		if (field) {
		    field.setValue(val);
		    if (form.trackResetOnLoad) {
			field.resetOriginalValue();
		    }
		}
	    }
	});
    },

    /**
     *  inputpanel, vbox
     * +---------------------------------------------------------------------+
     * |                             columnT                                 |
     * +---------------------------------------------------------------------+
     * |                          container, hbox                            |
     * |  +---------------+---------------+---------------+---------------+  |
     * |  |    column1    |    column2    |    column3    |    column4    |  |
     * |  | panel, anchor | panel, anchor | panel, anchor | panel, anchor |  |
     * |  +---------------+---------------+---------------+---------------+  |
     * +---------------------------------------------------------------------+
     * |                             columnB                                 |
     * +---------------------------------------------------------------------+
     */
    initComponent: function() {
	let me = this;

	let items;

	if (me.items) {
	    items = [
		{
		    layout: 'anchor',
		    items: me.items,
		},
	    ];
	    me.items = undefined;
	} else if (me.column4) {
	    items = [];
	    if (me.columnT) {
		items.push({
		    padding: '0 0 0 0',
		    layout: 'anchor',
		    items: me.columnT,
		});
	    }
	    items.push(
		{
		    layout: 'hbox',
		    defaults: {
			border: false,
			layout: 'anchor',
			flex: 1,
		    },
		    items: [
			{
			    padding: '0 10 0 0',
			    items: me.column1,
			},
			{
			    padding: '0 10 0 0',
			    items: me.column2,
			},
			{
			    padding: '0 10 0 0',
			    items: me.column3,
			},
			{
			    padding: '0 0 0 10',
			    items: me.column4,
			},
		    ],
		},
	    );
	    if (me.columnB) {
		items.push({
		    padding: '10 0 0 0',
		    layout: 'anchor',
		    items: me.columnB,
		});
	    }
	} else if (me.column1) {
	    items = [];
	    if (me.columnT) {
		items.push({
		    padding: '0 0 10 0',
		    layout: 'anchor',
		    items: me.columnT,
		});
	    }
	    items.push(
		{
		    layout: 'hbox',
		    defaults: {
			border: false,
			layout: 'anchor',
			flex: 1,
		    },
		    items: [
			{
			    padding: '0 10 0 0',
			    items: me.column1,
			},
			{
			    padding: '0 0 0 10',
			    items: me.column2 || [], // allow empty column
			},
		    ],
		},
	    );
	    if (me.columnB) {
		items.push({
		    padding: '10 0 0 0',
		    layout: 'anchor',
		    items: me.columnB,
		});
	    }
	} else {
	    throw "unsupported config";
	}

	let advItems;
	if (me.advancedItems) {
	    advItems = [
		{
		    layout: 'anchor',
		    items: me.advancedItems,
		},
	    ];
	    me.advancedItems = undefined;
	} else if (me.advancedColumn1 || me.advancedColumn2 || me.advancedColumnB) {
	    advItems = [
		{
		    layout: {
			type: 'hbox',
			align: 'begin',
		    },
		    defaults: {
			border: false,
			layout: 'anchor',
			flex: 1,
		    },
		    items: [
			{
			    padding: '0 10 0 0',
			    items: me.advancedColumn1 || [], // allow empty column
			},
			{
			    padding: '0 0 0 10',
			    items: me.advancedColumn2 || [], // allow empty column
			},
		    ],
		},
	    ];

	    me.advancedColumn1 = undefined;
	    me.advancedColumn2 = undefined;

	    if (me.advancedColumnB) {
		advItems.push({
		    padding: '10 0 0 0',
		    layout: 'anchor',
		    items: me.advancedColumnB,
		});
		me.advancedColumnB = undefined;
	    }
	}

	if (advItems) {
	    me.hasAdvanced = true;
	    advItems.unshift({
		xtype: 'box',
		hidden: false,
		border: true,
		autoEl: {
		    tag: 'hr',
		},
	    });
	    items.push({
		xtype: 'container',
		itemId: 'advancedContainer',
		hidden: !me.showAdvanced,
		defaults: {
		    border: false,
		},
		items: advItems,
	    });
	}

	Ext.apply(me, {
	    layout: {
		type: 'vbox',
		align: 'stretch',
	    },
	    defaultType: 'container',
	    items: items,
	});

	me.callParent();
    },
});

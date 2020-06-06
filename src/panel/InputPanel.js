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

    // if the panel has advanced items,
    // this will determine if they are shown by default
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

    initComponent: function() {
	let me = this;

	let items;

	if (me.items) {
	    me.columns = 1;
	    items = [
		{
		    columnWidth: 1,
		    layout: 'anchor',
		    items: me.items,
		},
	    ];
	    me.items = undefined;
	} else if (me.column4) {
	    me.columns = 4;
	    items = [
		{
		    columnWidth: 0.25,
		    padding: '0 10 0 0',
		    layout: 'anchor',
		    items: me.column1,
		},
		{
		    columnWidth: 0.25,
		    padding: '0 10 0 0',
		    layout: 'anchor',
		    items: me.column2,
		},
		{
		    columnWidth: 0.25,
		    padding: '0 10 0 0',
		    layout: 'anchor',
		    items: me.column3,
		},
		{
		    columnWidth: 0.25,
		    padding: '0 0 0 10',
		    layout: 'anchor',
		    items: me.column4,
		},
	    ];
	    if (me.columnB) {
		items.push({
		    columnWidth: 1,
		    padding: '10 0 0 0',
		    layout: 'anchor',
		    items: me.columnB,
		});
	    }
	} else if (me.column1) {
	    me.columns = 2;
	    items = [
		{
		    columnWidth: 0.5,
		    padding: '0 10 0 0',
		    layout: 'anchor',
		    items: me.column1,
		},
		{
		    columnWidth: 0.5,
		    padding: '0 0 0 10',
		    layout: 'anchor',
		    items: me.column2 || [], // allow empty column
		},
	    ];
	    if (me.columnB) {
		items.push({
		    columnWidth: 1,
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
		    columnWidth: 1,
		    layout: 'anchor',
		    items: me.advancedItems,
		},
	    ];
	    me.advancedItems = undefined;
	} else if (me.advancedColumn1) {
	    advItems = [
		{
		    columnWidth: 0.5,
		    padding: '0 10 0 0',
		    layout: 'anchor',
		    items: me.advancedColumn1,
		},
		{
		    columnWidth: 0.5,
		    padding: '0 0 0 10',
		    layout: 'anchor',
		    items: me.advancedColumn2 || [], // allow empty column
		},
	    ];

	    me.advancedColumn1 = undefined;
	    me.advancedColumn2 = undefined;

	    if (me.advancedColumnB) {
		advItems.push({
		    columnWidth: 1,
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
		columnWidth: 1,
		xtype: 'box',
		hidden: false,
		border: true,
		autoEl: {
		    tag: 'hr',
		},
	    });
	    items.push({
		columnWidth: 1,
		xtype: 'container',
		itemId: 'advancedContainer',
		hidden: !me.showAdvanced,
		layout: 'column',
		defaults: {
		    border: false,
		},
		items: advItems,
	    });
	}

	if (me.useFieldContainer) {
	    Ext.apply(me, {
		layout: 'fit',
		items: Ext.apply(me.useFieldContainer, {
		    layout: 'column',
		    defaultType: 'container',
		    items: items,
		}),
	    });
	} else {
	    Ext.apply(me, {
		layout: 'column',
		defaultType: 'container',
		items: items,
	    });
	}

	me.callParent();
    },
});

Ext.define('Proxmox.form.field.DisplayEdit', {
    extend: 'Ext.form.FieldContainer',
    alias: 'widget.pmxDisplayEditField',

    viewModel: {
	parent: null,
	data: {
	    editable: false,
	    value: undefined,
	},
    },

    displayType: 'displayfield',

    editConfig: {},
    editable: false,
    setEditable: function(editable) {
	let me = this;
	let vm = me.getViewModel();

	me.editable = editable;
	vm.set('editable', editable);
    },

    layout: 'fit',
    defaults: {
	hideLabel: true
    },

    initComponent: function() {
	let me = this;

	let displayConfig = {
	    xtype: me.displayType,
	    bind: {},
	};
	Ext.applyIf(displayConfig, me.initialConfig);
	delete displayConfig.editConfig;
	delete displayConfig.editable;

	let editConfig = Ext.apply({}, me.editConfig);
	Ext.applyIf(editConfig, {
	    xtype: 'textfield',
	    bind: {},
	});
	Ext.applyIf(editConfig, displayConfig);

	Ext.applyIf(displayConfig.bind, {
	    hidden: '{editable}',
	    disabled: '{editable}',
	    value: '{value}',
	});
	Ext.applyIf(editConfig.bind, {
	    hidden: '{!editable}',
	    disabled: '{!editable}',
	    value: '{value}',
	});

	// avoid glitch, start off correct even before viewmodel fixes it
	editConfig.disabled = editConfig.hidden = !me.editable;
	displayConfig.disabled = displayConfig.hidden = !!me.editable;

	editConfig.name = displayConfig.name = me.name;

	Ext.apply(me, {
	    items: [
		editConfig,
		displayConfig,
	    ],
	});

	me.callParent();

	me.getViewModel().set('editable', me.editable);
    },

});

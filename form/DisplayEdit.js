Ext.define('Proxmox.form.field.DisplayEdit', {
    extend: 'Ext.form.FieldContainer',
    alias: ['widget.pmxDisplayEditField'],

    viewModel: {
	data: {
	    editable: false,
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

    layout: 'hbox',
    defaults: {
	hideLabel: true
    },

    //setValue: me.callParent();

    initComponent: function() {
	let me = this;

	let displayConfig = {
	    xtype: me.displayType,
	    bind: {
		hidden: '{editable}',
		disabled: '{editable}',
	    },
	};
	Ext.applyIf(displayConfig, me.initialConfig);
	delete displayConfig.editConfig;
	delete displayConfig.editable;

	let editConfig = Ext.apply({}, me.editConfig); // clone, not reference!
	Ext.applyIf(editConfig, {
	    xtype: 'textfield',
	    bind: {
		hidden: '{!editable}',
		disabled: '{!editable}',
	    },
	});
	Ext.applyIf(editConfig, displayConfig);

	// avoid glitch, start off correct even before viewmodel fixes it
	editConfig.disabled = editConfig.hidden = !me.editable;
	displayConfig.disabled = displayConfig.hidden = !!me.editable;

	editConfig.name = displayConfig.name = me.name;

	Ext.apply(me, {
	    items: [
		displayConfig,
		editConfig,
	    ],
	});

	me.callParent();

	me.getViewModel().set('editable', me.editable);
    },

});

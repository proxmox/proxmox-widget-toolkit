/*
 * ComboGrid component: a ComboBox where the dropdown menu (the
 * "Picker") is a Grid with Rows and Columns expects a listConfig
 * object with a columns property roughly based on the GridPicker from
 * https://www.sencha.com/forum/showthread.php?299909
 *
*/

Ext.define('Proxmox.form.ComboGrid', {
    extend: 'Ext.form.field.ComboBox',
    alias: ['widget.proxmoxComboGrid'],

    // this value is used as default value after load()
    preferredValue: undefined,

    // hack: allow to select empty value
    // seems extjs does not allow that when 'editable == false'
    onKeyUp: function(e, t) {
        let me = this;
        let key = e.getKey();

        if (!me.editable && me.allowBlank && !me.multiSelect &&
	    (key === e.BACKSPACE || key === e.DELETE)) {
	    me.setValue('');
	}

        me.callParent(arguments);
    },

    config: {
	skipEmptyText: false,
	notFoundIsValid: false,
	deleteEmpty: false,
    },

    // needed to trigger onKeyUp etc.
    enableKeyEvents: true,

    editable: false,

    triggers: {
	clear: {
	    cls: 'pmx-clear-trigger',
	    weight: -1,
	    hidden: true,
	    handler: function() {
		let me = this;
		me.setValue('');
	    },
	},
    },

    setValue: function(value) {
	let me = this;
	let empty = Ext.isArray(value) ? !value.length : !value;
	me.triggers.clear.setVisible(!empty && me.allowBlank);
	return me.callParent([value]);
    },

    // override ExtJS method
    // if the field has multiSelect enabled, the store is not loaded, and
    // the displayfield == valuefield, it saves the rawvalue as an array
    // but the getRawValue method is only defined in the textfield class
    // (which has not to deal with arrays) an returns the string in the
    // field (not an array)
    //
    // so if we have multiselect enabled, return the rawValue (which
    // should be an array) and else we do callParent so
    // it should not impact any other use of the class
    getRawValue: function() {
	let me = this;
	if (me.multiSelect) {
	    return me.rawValue;
	} else {
	    return me.callParent();
	}
    },

    getSubmitData: function() {
	let me = this;

	let data = null;
	if (!me.disabled && me.submitValue) {
	    let val = me.getSubmitValue();
	    if (val !== null) {
		data = {};
		data[me.getName()] = val;
	    } else if (me.getDeleteEmpty()) {
		data = {};
		data.delete = me.getName();
	    }
	}
	return data;
   },

    getSubmitValue: function() {
	let me = this;

	let value = me.callParent();
	if (value !== '') {
	    return value;
	}

	return me.getSkipEmptyText() ? null: value;
    },

    setAllowBlank: function(allowBlank) {
	this.allowBlank = allowBlank;
	this.validate();
    },

// override ExtJS protected method
    onBindStore: function(store, initial) {
	let me = this,
	    picker = me.picker,
	    extraKeySpec,
	    valueCollectionConfig;

	// We're being bound, not unbound...
	if (store) {
	    // If store was created from a 2 dimensional array with generated field names 'field1' and 'field2'
	    if (store.autoCreated) {
		me.queryMode = 'local';
		me.valueField = me.displayField = 'field1';
		if (!store.expanded) {
		    me.displayField = 'field2';
		}

		// displayTpl config will need regenerating with the autogenerated displayField name 'field1'
		me.setDisplayTpl(null);
	    }
	    if (!Ext.isDefined(me.valueField)) {
		me.valueField = me.displayField;
	    }

	    // Add a byValue index to the store so that we can efficiently look up records by the value field
	    // when setValue passes string value(s).
	    // The two indices (Ext.util.CollectionKeys) are configured unique: false, so that if duplicate keys
	    // are found, they are all returned by the get call.
	    // This is so that findByText and findByValue are able to return the *FIRST* matching value. By default,
	    // if unique is true, CollectionKey keeps the *last* matching value.
	    extraKeySpec = {
		byValue: {
		    rootProperty: 'data',
		    unique: false,
		},
	    };
	    extraKeySpec.byValue.property = me.valueField;
	    store.setExtraKeys(extraKeySpec);

	    if (me.displayField === me.valueField) {
		store.byText = store.byValue;
	    } else {
		extraKeySpec.byText = {
		    rootProperty: 'data',
		    unique: false,
		};
		extraKeySpec.byText.property = me.displayField;
		store.setExtraKeys(extraKeySpec);
	    }

	    // We hold a collection of the values which have been selected, keyed by this field's valueField.
	    // This collection also functions as the selected items collection for the BoundList's selection model
	    valueCollectionConfig = {
		rootProperty: 'data',
		extraKeys: {
		    byInternalId: {
			property: 'internalId',
		    },
		    byValue: {
			property: me.valueField,
			rootProperty: 'data',
		    },
		},
		// Whenever this collection is changed by anyone, whether by this field adding to it,
		// or the BoundList operating, we must refresh our value.
		listeners: {
		    beginupdate: me.onValueCollectionBeginUpdate,
		    endupdate: me.onValueCollectionEndUpdate,
		    scope: me,
		},
	    };

	    // This becomes our collection of selected records for the Field.
	    me.valueCollection = new Ext.util.Collection(valueCollectionConfig);

	    // We use the selected Collection as our value collection and the basis
	    // for rendering the tag list.

	    //proxmox override: since the picker is represented by a grid panel,
	    // we changed here the selection to RowModel
	    me.pickerSelectionModel = new Ext.selection.RowModel({
		mode: me.multiSelect ? 'SIMPLE' : 'SINGLE',
		// There are situations when a row is selected on mousedown but then the mouse is
		// dragged to another row and released.  In these situations, the event target for
		// the click event won't be the row where the mouse was released but the boundview.
		// The view will then determine that it should fire a container click, and the
		// DataViewModel will then deselect all prior selections. Setting
		// `deselectOnContainerClick` here will prevent the model from deselecting.
		deselectOnContainerClick: false,
		enableInitialSelection: false,
		pruneRemoved: false,
		selected: me.valueCollection,
		store: store,
		listeners: {
		    scope: me,
		    lastselectedchanged: me.updateBindSelection,
		},
	    });

	    if (!initial) {
		me.resetToDefault();
	    }

	    if (picker) {
		picker.setSelectionModel(me.pickerSelectionModel);
		if (picker.getStore() !== store) {
		    picker.bindStore(store);
		}
	    }
	}
    },

    // copied from ComboBox
    createPicker: function() {
        let me = this;
        let picker;

        let pickerCfg = Ext.apply({
                // proxmox overrides: display a grid for selection
                xtype: 'gridpanel',
                id: me.pickerId,
                pickerField: me,
                floating: true,
                hidden: true,
                store: me.store,
                displayField: me.displayField,
                preserveScrollOnRefresh: true,
                pageSize: me.pageSize,
                tpl: me.tpl,
                selModel: me.pickerSelectionModel,
                focusOnToFront: false,
            }, me.listConfig, me.defaultListConfig);

        picker = me.picker || Ext.widget(pickerCfg);

        if (picker.getStore() !== me.store) {
            picker.bindStore(me.store);
        }

        if (me.pageSize) {
            picker.pagingToolbar.on('beforechange', me.onPageChange, me);
        }

        // proxmox overrides: pass missing method in gridPanel to its view
        picker.refresh = function() {
            picker.getSelectionModel().select(me.valueCollection.getRange());
            picker.getView().refresh();
        };
        picker.getNodeByRecord = function() {
            picker.getView().getNodeByRecord(arguments);
        };

        // We limit the height of the picker to fit in the space above
        // or below this field unless the picker has its own ideas about that.
        if (!picker.initialConfig.maxHeight) {
            picker.on({
                beforeshow: me.onBeforePickerShow,
                scope: me,
            });
        }
        picker.getSelectionModel().on({
            beforeselect: me.onBeforeSelect,
            beforedeselect: me.onBeforeDeselect,
            focuschange: me.onFocusChange,
            selectionChange: function(sm, selectedRecords) {
                if (selectedRecords.length) {
                    this.setValue(selectedRecords);
                    this.fireEvent('select', me, selectedRecords);
                }
            },
            scope: me,
        });

	// hack for extjs6
	// when the clicked item is the same as the previously selected,
	// it does not select the item
	// instead we hide the picker
	if (!me.multiSelect) {
	    picker.on('itemclick', function(sm, record) {
		if (picker.getSelection()[0] === record) {
		    picker.hide();
		}
	    });
	}

	// when our store is not yet loaded, we increase
	// the height of the gridpanel, so that we can see
	// the loading mask
	//
	// we save the minheight to reset it after the load
	picker.on('show', function() {
	    if (me.enableLoadMask) {
		me.savedMinHeight = picker.getMinHeight();
		picker.setMinHeight(100);
	    }
	});

        picker.getNavigationModel().navigateOnSpace = false;

        return picker;
    },

    clearLocalFilter: function() {
        let me = this,
            filter = me.queryFilter;

        if (filter) {
            me.queryFilter = null;
            me.changingFilters = true;
            me.store.removeFilter(filter, true);
            me.changingFilters = false;
        }
    },

    isValueInStore: function(value) {
	let me = this;
	let store = me.store;
	let found = false;

	if (!store) {
	    return found;
	}

	// Make sure the current filter is removed before checking the store
	// to prevent false negative results when iterating over a filtered store.
	// All store.find*() method's operate on the filtered store.
	if (me.queryFilter && me.queryMode === 'local' && me.clearFilterOnBlur) {
	    me.clearLocalFilter();
	}

	if (Ext.isArray(value)) {
	    Ext.Array.each(value, function(v) {
		if (store.findRecord(me.valueField, v)) {
		    found = true;
		    return false; // break
		}
		return true;
	    });
	} else {
	    found = !!store.findRecord(me.valueField, value);
	}

	return found;
    },

    validator: function(value) {
	let me = this;

	if (!value) {
	    return true; // handled later by allowEmpty in the getErrors call chain
	}

	// we normally get here the displayField as value, but if a valueField
	// is configured we need to get the "actual" value, to ensure it is in
	// the store. Below check is copied from ExtJS 6.0.2 ComboBox source
	//
	// we also have to get the 'real' value if the we have a mulitSelect
	// Field but got a non array value
	if ((me.valueField && me.valueField !== me.displayField) ||
	    (me.multiSelect && !Ext.isArray(value))) {
	    value = me.getValue();
	}

	if (!(me.notFoundIsValid || me.isValueInStore(value))) {
	    return gettext('Invalid Value');
	}

	return true;
    },

    // validate after enabling a field, otherwise blank fields with !allowBlank
    // are sometimes not marked as invalid
    setDisabled: function(value) {
	this.callParent([value]);
	this.validate();
    },

    initComponent: function() {
	let me = this;

	Ext.apply(me, {
	    queryMode: 'local',
	    matchFieldWidth: false,
	});

	Ext.applyIf(me, { value: '' }); // hack: avoid ExtJS validate() bug

	Ext.applyIf(me.listConfig, { width: 400 });

	me.callParent();

	// Create the picker at an early stage, so it is available to store the previous selection
	if (!me.picker) {
	    me.createPicker();
	}

	me.mon(me.store, 'beforeload', function() {
	    if (!me.isDisabled()) {
		me.enableLoadMask = true;
	    }
	});

	// hack: autoSelect does not work
	me.mon(me.store, 'load', function(store, r, success, o) {
	    if (success) {
		me.clearInvalid();

		if (me.enableLoadMask) {
		    delete me.enableLoadMask;

		    // if the picker exists,
		    // we reset its minheight to the saved let/0
		    // we have to update the layout, otherwise the height
		    // gets not recalculated
		    if (me.picker) {
			me.picker.setMinHeight(me.savedMinHeight || 0);
			delete me.savedMinHeight;
			me.picker.updateLayout();
		    }
		}

		let def = me.getValue() || me.preferredValue;
		if (def) {
		    me.setValue(def, true); // sync with grid
		}
		let found = false;
		if (def) {
		    found = me.isValueInStore(def);
		}

		if (!found) {
		    let rec = me.store.first();
		    if (me.autoSelect && rec && rec.data) {
			def = rec.data[me.valueField];
			me.setValue(def, true);
		    } else if (!me.allowBlank && !(Ext.isArray(def) ? def.length : def)) {
			me.setValue(def);
			if (!me.notFoundIsValid && !me.isDisabled()) {
			    me.markInvalid(me.blankText);
			}
		    }
		}
	    }
	});
    },
});
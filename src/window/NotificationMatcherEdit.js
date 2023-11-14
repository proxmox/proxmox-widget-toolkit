Ext.define('Proxmox.panel.NotificationMatcherGeneralPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxNotificationMatcherGeneralPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    items: [
	{
	    xtype: 'pmxDisplayEditField',
	    name: 'name',
	    cbind: {
		value: '{name}',
		editable: '{isCreate}',
	    },
	    fieldLabel: gettext('Matcher Name'),
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxtextfield',
	    name: 'comment',
	    fieldLabel: gettext('Comment'),
	    cbind: {
		deleteEmpty: '{!isCreate}',
	    },
	},
    ],
});

Ext.define('Proxmox.panel.NotificationMatcherTargetPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxNotificationMatcherTargetPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    items: [
	{
	    xtype: 'pmxNotificationTargetSelector',
	    name: 'target',
	    allowBlank: false,
	},
    ],
});

Ext.define('Proxmox.window.NotificationMatcherEdit', {
    extend: 'Proxmox.window.Edit',

    isAdd: true,

    fieldDefaults: {
	labelWidth: 120,
    },

    width: 700,

    initComponent: function() {
	let me = this;

	me.isCreate = !me.name;

	if (!me.baseUrl) {
	    throw "baseUrl not set";
	}

	me.url = `/api2/extjs${me.baseUrl}/matchers`;

	if (me.isCreate) {
	    me.method = 'POST';
	} else {
	    me.url += `/${me.name}`;
	    me.method = 'PUT';
	}

	me.subject = gettext('Notification Matcher');

	Ext.apply(me, {
	    bodyPadding: 0,
	    items: [
		{
		    xtype: 'tabpanel',
		    region: 'center',
		    layout: 'fit',
		    bodyPadding: 10,
		    items: [
			{
			    name: me.name,
			    title: gettext('General'),
			    xtype: 'pmxNotificationMatcherGeneralPanel',
			    isCreate: me.isCreate,
			    baseUrl: me.baseUrl,
			},
			{
			    name: me.name,
			    title: gettext('Match Rules'),
			    xtype: 'pmxNotificationMatchRulesEditPanel',
			    isCreate: me.isCreate,
			    baseUrl: me.baseUrl,
			},
			{
			    name: me.name,
			    title: gettext('Targets to notify'),
			    xtype: 'pmxNotificationMatcherTargetPanel',
			    isCreate: me.isCreate,
			    baseUrl: me.baseUrl,
			},
		    ],
		},
	    ],
	});

	me.callParent();

	if (!me.isCreate) {
	    me.load();
	}
    },
});

Ext.define('Proxmox.form.NotificationTargetSelector', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.pmxNotificationTargetSelector',

    mixins: {
	field: 'Ext.form.field.Field',
    },

    padding: '0 0 10 0',

    allowBlank: true,
    selectAll: false,
    isFormField: true,

    store: {
	autoLoad: true,
	model: 'proxmox-notification-endpoints',
	sorters: 'name',
    },

    columns: [
	{
	    header: gettext('Target Name'),
	    dataIndex: 'name',
	    flex: 1,
	},
	{
	    header: gettext('Type'),
	    dataIndex: 'type',
	    flex: 1,
	},
	{
	    header: gettext('Comment'),
	    dataIndex: 'comment',
	    flex: 3,
	},
    ],

    selModel: {
	selType: 'checkboxmodel',
	mode: 'SIMPLE',
    },

    checkChangeEvents: [
	'selectionchange',
	'change',
    ],

    listeners: {
	selectionchange: function() {
	    // to trigger validity and error checks
	    this.checkChange();
	},
    },

    getSubmitData: function() {
	let me = this;
	let res = {};
	res[me.name] = me.getValue();
	return res;
    },

    getValue: function() {
	let me = this;
	if (me.savedValue !== undefined) {
	    return me.savedValue;
	}
	let sm = me.getSelectionModel();
	return (sm.getSelection() ?? []).map(item => item.data.name);
    },

    setValueSelection: function(value) {
	let me = this;

	let store = me.getStore();

	let notFound = [];
	let selection = value.map(item => {
	    let found = store.findRecord('name', item, 0, false, true, true);
	    if (!found) {
		notFound.push(item);
	    }
	    return found;
	}).filter(r => r);

	for (const name of notFound) {
	    let rec = store.add({
		name,
		type: '-',
		comment: gettext('Included target does not exist!'),
	    });
	    selection.push(rec[0]);
	}

	let sm = me.getSelectionModel();
	if (selection.length) {
	    sm.select(selection);
	} else {
	    sm.deselectAll();
	}
	// to correctly trigger invalid class
	me.getErrors();
    },

    setValue: function(value) {
	let me = this;

	let store = me.getStore();
	if (!store.isLoaded()) {
	    me.savedValue = value;
	    store.on('load', function() {
		me.setValueSelection(value);
		delete me.savedValue;
	    }, { single: true });
	} else {
	    me.setValueSelection(value);
	}
	return me.mixins.field.setValue.call(me, value);
    },

    getErrors: function(value) {
	let me = this;
	if (!me.isDisabled() && me.allowBlank === false &&
	    me.getSelectionModel().getCount() === 0) {
	    me.addBodyCls(['x-form-trigger-wrap-default', 'x-form-trigger-wrap-invalid']);
	    return [gettext('No target selected')];
	}

	me.removeBodyCls(['x-form-trigger-wrap-default', 'x-form-trigger-wrap-invalid']);
	return [];
    },

    initComponent: function() {
	let me = this;
	me.callParent();
	me.initField();
    },

});

Ext.define('Proxmox.panel.NotificationRulesEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxNotificationMatchRulesEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    viewModel: {
	data: {
	    selectedRecord: null,
	    matchFieldType: 'exact',
	    matchFieldField: '',
	    matchFieldValue: '',
	    rootMode: 'all',
	},

	formulas: {
	    nodeType: {
		get: function(get) {
		    let record = get('selectedRecord');
		    return record?.get('type');
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');

		    let data;

		    switch (value) {
			case 'match-severity':
			    data = {
				value: ['info', 'notice', 'warning', 'error'],
			    };
			    break;
			case 'match-field':
			    data = {
				type: 'exact',
				field: '',
				value: '',
			    };
			    break;
			case 'match-calendar':
			    data = {
				value: '',
			    };
			    break;
		    }

		    let node = {
			type: value,
			data,
		    };
		    record.set(node);
		},
	    },
	    showMatchingMode: function(get) {
		let record = get('selectedRecord');
		if (!record) {
		    return false;
		}
		return record.isRoot();
	    },
	    showMatcherType: function(get) {
		let record = get('selectedRecord');
		if (!record) {
		    return false;
		}
		return !record.isRoot();
	    },
	    typeIsMatchField: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		get: function(record) {
		    return record?.get('type') === 'match-field';
		},
	    },
	    typeIsMatchSeverity: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		get: function(record) {
		    return record?.get('type') === 'match-severity';
		},
	    },
	    typeIsMatchCalendar: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		get: function(record) {
		    return record?.get('type') === 'match-calendar';
		},
	    },
	    matchFieldType: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');
		    record.set({
			data: {
			    ...currentData,
			    type: value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.type;
		},
	    },
	    matchFieldField: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');

		    record.set({
			data: {
			    ...currentData,
			    field: value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.field;
		},
	    },
	    matchFieldValue: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');
		    record.set({
			data: {
			    ...currentData,
			    value: value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.value;
		},
	    },
	    matchSeverityValue: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');
		    record.set({
			data: {
			    ...currentData,
			    value: value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.value;
		},
	    },
	    matchCalendarValue: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');
		    record.set({
			data: {
			    ...currentData,
			    value: value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.value;
		},
	    },
	    rootMode: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');
		    record.set({
			data: {
			    ...currentData,
			    value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.value;
		},
	    },
	    invertMatch: {
		bind: {
		    bindTo: '{selectedRecord}',
		    deep: true,
		},
		set: function(value) {
		    let me = this;
		    let record = me.get('selectedRecord');
		    let currentData = record.get('data');
		    record.set({
			data: {
			    ...currentData,
			    invert: value,
			},
		    });
		},
		get: function(record) {
		    return record?.get('data')?.invert;
		},
	    },
	},
    },

    column1: [
	{
	    xtype: 'pmxNotificationMatchRuleTree',
	    cbind: {
		isCreate: '{isCreate}',
	    },
	},
    ],
    column2: [
	{
	    xtype: 'pmxNotificationMatchRuleSettings',
	},

    ],

    onGetValues: function(values) {
	let me = this;

	let deleteArrayIfEmtpy = (field) => {
	    if (Ext.isArray(values[field])) {
		if (values[field].length === 0) {
		    delete values[field];
		    if (!me.isCreate) {
			Proxmox.Utils.assemble_field_data(values, { 'delete': field });
		    }
		}
	    }
	};
	deleteArrayIfEmtpy('match-field');
	deleteArrayIfEmtpy('match-severity');
	deleteArrayIfEmtpy('match-calendar');

	return values;
    },
});

Ext.define('Proxmox.panel.NotificationMatchRuleTree', {
    extend: 'Ext.panel.Panel',
    xtype: 'pmxNotificationMatchRuleTree',
    mixins: ['Proxmox.Mixin.CBind'],
    border: false,

    getNodeTextAndIcon: function(type, data) {
	let text;
	let iconCls;

	switch (type) {
	    case 'match-severity': {
		let v = data.value.join(', ');
		text = Ext.String.format(gettext("Match severity: {0}"), v);
		iconCls = 'fa fa-exclamation';
	    } break;
	    case 'match-field': {
		let field = data.field;
		let value = data.value;
		text = Ext.String.format(gettext("Match field: {0}={1}"), field, value);
		iconCls = 'fa fa-cube';
	    } break;
	    case 'match-calendar': {
		let v = data.value;
		text = Ext.String.format(gettext("Match calendar: {0}"), v);
		iconCls = 'fa fa-calendar-o';
	    } break;
	    case 'mode':
		if (data.value === 'all') {
		    text = gettext("All");
		} else if (data.value === 'any') {
		    text = gettext("Any");
		}
		if (data.invert) {
		    text = `!${text}`;
		}
		iconCls = 'fa fa-filter';

		break;
	}

	return [text, iconCls];
    },

    initComponent: function() {
	let me = this;

	let treeStore = Ext.create('Ext.data.TreeStore', {
	    root: {
		expanded: true,
		expandable: false,
		text: '',
		type: 'mode',
		data: {
		    value: 'all',
		    invert: false,
		},
		children: [],
		iconCls: 'fa fa-filter',
	    },
	});

	let realMatchFields = Ext.create({
	    xtype: 'hiddenfield',
	    setValue: function(value) {
		this.value = value;
		this.checkChange();
	    },
	    getValue: function() {
		return this.value;
	    },
	    getSubmitValue: function() {
		let value = this.value;
		if (!value) {
		    value = [];
		}
		return value;
	    },
	    name: 'match-field',
	});

	let realMatchSeverity = Ext.create({
	    xtype: 'hiddenfield',
	    setValue: function(value) {
		this.value = value;
		this.checkChange();
	    },
	    getValue: function() {
		return this.value;
	    },
	    getSubmitValue: function() {
		let value = this.value;
		if (!value) {
		    value = [];
		}
		return value;
	    },
	    name: 'match-severity',
	});

	let realMode = Ext.create({
	    xtype: 'hiddenfield',
	    name: 'mode',
	    setValue: function(value) {
		this.value = value;
		this.checkChange();
	    },
	    getValue: function() {
		return this.value;
	    },
	    getSubmitValue: function() {
		let value = this.value;
		return value;
	    },
	});

	let realMatchCalendar = Ext.create({
	    xtype: 'hiddenfield',
	    name: 'match-calendar',

	    setValue: function(value) {
		this.value = value;
		this.checkChange();
	    },
	    getValue: function() {
		return this.value;
	    },
	    getSubmitValue: function() {
		let value = this.value;
		return value;
	    },
	});

	let realInvertMatch = Ext.create({
	    xtype: 'proxmoxcheckbox',
	    name: 'invert-match',
	    hidden: true,
	    deleteEmpty: !me.isCreate,
	});

	let storeChanged = function(store) {
	    store.suspendEvent('datachanged');

	    let matchFieldStmts = [];
	    let matchSeverityStmts = [];
	    let matchCalendarStmts = [];
	    let modeStmt = 'all';
	    let invertMatchStmt = false;

	    store.each(function(model) {
		let type = model.get('type');
		let data = model.get('data');

		switch (type) {
		    case 'match-field':
			matchFieldStmts.push(`${data.type}:${data.field}=${data.value}`);
			break;
		    case 'match-severity':
			matchSeverityStmts.push(data.value.join(','));
			break;
		    case 'match-calendar':
			matchCalendarStmts.push(data.value);
			break;
		    case 'mode':
			modeStmt = data.value;
			invertMatchStmt = data.invert;
			break;
		}

		let [text, iconCls] = me.getNodeTextAndIcon(type, data);
		model.set({
		    text,
		    iconCls,
		});
	    });

	    realMatchFields.suspendEvent('change');
	    realMatchFields.setValue(matchFieldStmts);
	    realMatchFields.resumeEvent('change');

	    realMatchCalendar.suspendEvent('change');
	    realMatchCalendar.setValue(matchCalendarStmts);
	    realMatchCalendar.resumeEvent('change');

	    realMode.suspendEvent('change');
	    realMode.setValue(modeStmt);
	    realMode.resumeEvent('change');

	    realInvertMatch.suspendEvent('change');
	    realInvertMatch.setValue(invertMatchStmt);
	    realInvertMatch.resumeEvent('change');

	    realMatchSeverity.suspendEvent('change');
	    realMatchSeverity.setValue(matchSeverityStmts);
	    realMatchSeverity.resumeEvent('change');

	    store.resumeEvent('datachanged');
	};

	realMatchFields.addListener('change', function(field, value) {
	    let parseMatchField = function(filter) {
		let [, type, matchedField, matchedValue] =
		    filter.match(/^(?:(regex|exact):)?([A-Za-z0-9_][A-Za-z0-9._-]*)=(.+)$/);
		if (type === undefined) {
		    type = "exact";
		}
		return {
		    type: 'match-field',
		    data: {
			type,
			field: matchedField,
			value: matchedValue,
		    },
		    leaf: true,
		};
	    };

	    for (let node of treeStore.queryBy(
		record => record.get('type') === 'match-field',
	    ).getRange()) {
		node.remove(true);
	    }

	    let records = value.map(parseMatchField);

	    let rootNode = treeStore.getRootNode();

	    for (let record of records) {
		rootNode.appendChild(record);
	    }
	});

	realMatchSeverity.addListener('change', function(field, value) {
	    let parseSeverity = function(severities) {
		return {
		    type: 'match-severity',
		    data: {
			value: severities.split(','),
		    },
		    leaf: true,
		};
	    };

	    for (let node of treeStore.queryBy(
		record => record.get('type') === 'match-severity').getRange()) {
		node.remove(true);
	    }

	    let records = value.map(parseSeverity);
	    let rootNode = treeStore.getRootNode();

	    for (let record of records) {
		rootNode.appendChild(record);
	    }
	});

	realMatchCalendar.addListener('change', function(field, value) {
	    let parseCalendar = function(timespan) {
		return {
		    type: 'match-calendar',
		    data: {
			value: timespan,
		    },
		    leaf: true,
		};
	    };

	    for (let node of treeStore.queryBy(
		record => record.get('type') === 'match-calendar').getRange()) {
		node.remove(true);
	    }

	    let records = value.map(parseCalendar);
	    let rootNode = treeStore.getRootNode();

	    for (let record of records) {
		rootNode.appendChild(record);
	    }
	});

	realMode.addListener('change', function(field, value) {
	    let data = treeStore.getRootNode().get('data');
	    treeStore.getRootNode().set('data', {
		...data,
		value,
	    });
	});

	realInvertMatch.addListener('change', function(field, value) {
	    let data = treeStore.getRootNode().get('data');
	    treeStore.getRootNode().set('data', {
		...data,
		invert: value,
	    });
	});

	treeStore.addListener('datachanged', storeChanged);

	let treePanel = Ext.create({
	    xtype: 'treepanel',
	    store: treeStore,
	    minHeight: 300,
	    maxHeight: 300,
	    scrollable: true,

	    bind: {
		selection: '{selectedRecord}',
	    },
	});

	let addNode = function() {
	    let node = {
		type: 'match-field',
		data: {
		    type: 'exact',
		    field: '',
		    value: '',
		},
		leaf: true,
	    };
	    treeStore.getRootNode().appendChild(node);
	    treePanel.setSelection(treeStore.getRootNode().lastChild);
	};

	let deleteNode = function() {
	    let selection = treePanel.getSelection();
	    for (let selected of selection) {
		if (!selected.isRoot()) {
		    selected.remove(true);
		}
	    }
	};

	Ext.apply(me, {
	    items: [
		realMatchFields,
		realMode,
		realMatchSeverity,
		realInvertMatch,
		realMatchCalendar,
		treePanel,
		{
		    xtype: 'button',
		    margin: '5 5 5 0',
		    text: gettext('Add'),
		    iconCls: 'fa fa-plus-circle',
		    handler: addNode,
		},
		{
		    xtype: 'button',
		    margin: '5 5 5 0',
		    text: gettext('Remove'),
		    iconCls: 'fa fa-minus-circle',
		    handler: deleteNode,
		},
	    ],
	});
	me.callParent();
    },
});

Ext.define('Proxmox.panel.NotificationMatchRuleSettings', {
    extend: 'Ext.panel.Panel',
    xtype: 'pmxNotificationMatchRuleSettings',
    border: false,

    items: [
	{
	    xtype: 'proxmoxKVComboBox',
	    name: 'mode',
	    fieldLabel: gettext('Match if'),
	    allowBlank: false,
	    isFormField: false,

	    comboItems: [
		['all', gettext('All rules match')],
		['any', gettext('Any rule matches')],
	    ],
	    bind: {
		hidden: '{!showMatchingMode}',
		disabled: '{!showMatchingMode}',
		value: '{rootMode}',
	    },
	},
	{
	    xtype: 'proxmoxcheckbox',
	    fieldLabel: gettext('Invert match'),
	    isFormField: false,
	    uncheckedValue: 0,
	    defaultValue: 0,
	    bind: {
		hidden: '{!showMatchingMode}',
		disabled: '{!showMatchingMode}',
		value: '{invertMatch}',
	    },

	},
	{
	    xtype: 'proxmoxKVComboBox',
	    fieldLabel: gettext('Node type'),
	    isFormField: false,
	    allowBlank: false,

	    bind: {
		value: '{nodeType}',
		hidden: '{!showMatcherType}',
		disabled: '{!showMatcherType}',
	    },

	    comboItems: [
		['match-field', gettext('Match Field')],
		['match-severity', gettext('Match Severity')],
		['match-calendar', gettext('Match Calendar')],
	    ],
	},
	{
	    fieldLabel: 'Match Type',
	    xtype: 'proxmoxKVComboBox',
	    reference: 'type',
	    isFormField: false,
	    allowBlank: false,
	    submitValue: false,

	    bind: {
		hidden: '{!typeIsMatchField}',
		disabled: '{!typeIsMatchField}',
		value: '{matchFieldType}',
	    },

	    comboItems: [
		['exact', gettext('Exact')],
		['regex', gettext('Regex')],
	    ],
	},
	{
	    fieldLabel: gettext('Field'),
	    xtype: 'textfield',
	    isFormField: false,
	    submitValue: false,
	    bind: {
		hidden: '{!typeIsMatchField}',
		disabled: '{!typeIsMatchField}',
		value: '{matchFieldField}',
	    },
	},
	{
	    fieldLabel: gettext('Value'),
	    xtype: 'textfield',
	    isFormField: false,
	    submitValue: false,
	    allowBlank: false,
	    bind: {
		hidden: '{!typeIsMatchField}',
		disabled: '{!typeIsMatchField}',
		value: '{matchFieldValue}',
	    },
	},
	{
	    xtype: 'proxmoxKVComboBox',
	    fieldLabel: gettext('Severities to match'),
	    isFormField: false,
	    allowBlank: true,
	    multiSelect: true,

	    bind: {
		value: '{matchSeverityValue}',
		hidden: '{!typeIsMatchSeverity}',
		disabled: '{!typeIsMatchSeverity}',
	    },

	    comboItems: [
		['info', gettext('Info')],
		['notice', gettext('Notice')],
		['warning', gettext('Warning')],
		['error', gettext('Error')],
	    ],
	},
	{
	    xtype: 'proxmoxKVComboBox',
	    fieldLabel: gettext('Timespan to match'),
	    isFormField: false,
	    allowBlank: false,
	    editable: true,
	    displayField: 'key',

	    bind: {
		value: '{matchCalendarValue}',
		hidden: '{!typeIsMatchCalendar}',
		disabled: '{!typeIsMatchCalender}',
	    },

	    comboItems: [
		['mon 8-12', ''],
		['tue..fri,sun 0:00-23:59', ''],
	    ],
	},
    ],
});

Ext.define('Proxmox.node.Tasks', {
    extend: 'Ext.grid.GridPanel',

    alias: 'widget.proxmoxNodeTasks',

    stateful: true,
    stateId: 'pve-grid-node-tasks',

    loadMask: true,
    sortableColumns: false,

    // set extra filter components, must have a 'name' property for the parameter, and must
    // trigger a 'change' event if the value is 'undefined', it will not be sent to the api
    extraFilter: [],


    // fixed filters which cannot be changed after instantiation, for example:
    // { vmid: 100 }
    preFilter: {},

    controller: {
	xclass: 'Ext.app.ViewController',

	showTaskLog: function() {
	    let me = this;
	    let selection = me.getView().getSelection();
	    if (selection.length < 1) {
		return;
	    }

	    let rec = selection[0];

	    Ext.create('Proxmox.window.TaskViewer', {
		upid: rec.data.upid,
		endtime: rec.data.endtime,
	    }).show();
	},

	updateLayout: function(store, records, success, operation) {
	    let me = this;
	    let view = me.getView().getView(); // the table view, not the whole grid
	    Proxmox.Utils.setErrorMask(view, false);
	    // update the scrollbar on every store load since the total count might be different.
	    // the buffered grid plugin does this only on (user) scrolling itself and even reduces
	    // the scrollheight again when scrolling up
	    me.getView().updateLayout();

	    if (!success) {
		Proxmox.Utils.setErrorMask(view, Proxmox.Utils.getResponseErrorMessage(operation.getError()));
	    }
	},

	refresh: function() {
	    let me = this;
	    let view = me.getView();

	    let selection = view.getSelection();
	    let store = me.getViewModel().get('bufferedstore');
	    if (selection && selection.length > 0) {
		// deselect if selection is not there anymore
		if (!store.contains(selection[0])) {
		    view.setSelection(undefined);
		}
	    }
	},

	sinceChange: function(field, newval) {
	    let me = this;
	    let vm = me.getViewModel();

	    vm.set('since', newval);
	},

	untilChange: function(field, newval, oldval) {
	    let me = this;
	    let vm = me.getViewModel();

	    vm.set('until', newval);
	},

	reload: function() {
	    let me = this;
	    let view = me.getView();
	    view.getStore().load();
	},

	showFilter: function(btn, pressed) {
	    let me = this;
	    let vm = me.getViewModel();
	    vm.set('showFilter', pressed);
	},

	clearFilter: function() {
	    let me = this;
	    me.lookup('filtertoolbar').query('field').forEach((field) => {
		field.setValue(undefined);
	    });
	},
    },

    listeners: {
	itemdblclick: 'showTaskLog',
    },

    viewModel: {
	data: {
	    typefilter: '',
	    statusfilter: '',
	    showFilter: false,
	    extraFilter: {},
	    since: null,
	    until: null,
	},

	formulas: {
	    filterIcon: (get) => 'fa fa-filter' + (get('showFilter') ? ' info-blue' : ''),
	    extraParams: function(get) {
		let me = this;
		let params = {};
		if (get('typefilter')) {
		    params.typefilter = get('typefilter');
		}
		if (get('statusfilter')) {
		    params.statusfilter = get('statusfilter');
		}

		if (get('extraFilter')) {
		    let extraFilter = get('extraFilter');
		    for (const [name, value] of Object.entries(extraFilter)) {
			if (value !== undefined && value !== null && value !== "") {
			    params[name] = value;
			}
		    }
		}

		if (get('since')) {
		    params.since = get('since').valueOf()/1000;
		}

		if (get('until')) {
		    let until = new Date(get('until').getTime()); // copy object
		    until.setDate(until.getDate() + 1); // end of the day
		    params.until = until.valueOf()/1000;
		}

		me.getView().getStore().load();

		return params;
	    },
	    filterCount: function(get) {
		let count = 0;
		if (get('typefilter')) {
		    count++;
		}
		let status = get('statusfilter');
		if ((Ext.isArray(status) && status.length > 0) ||
		    (!Ext.isArray(status) && status)) {
		    count++;
		}
		if (get('since')) {
		    count++;
		}
		if (get('until')) {
		    count++;
		}

		if (get('extraFilter')) {
		    let preFilter = get('preFilter') || {};
		    let extraFilter = get('extraFilter');
		    for (const [name, value] of Object.entries(extraFilter)) {
			if (value !== undefined && value !== null && value !== "" &&
			    preFilter[name] === undefined
			) {
			    count++;
			}
		    }
		}

		return count;
	    },
	    clearFilterText: function(get) {
		let count = get('filterCount');
		let fieldMsg = '';
		if (count > 1) {
		    fieldMsg = ` (${count} ${gettext('Fields')})`;
		} else if (count > 0) {
		    fieldMsg = ` (1 ${gettext('Field')})`;
		}
		return gettext('Clear Filter') + fieldMsg;
	    },
	},

	stores: {
	    bufferedstore: {
		type: 'buffered',
		pageSize: 500,
		autoLoad: true,
		remoteFilter: true,
		model: 'proxmox-tasks',
		proxy: {
		    type: 'proxmox',
		    startParam: 'start',
		    limitParam: 'limit',
		    extraParams: '{extraParams}',
		    url: '{url}',
		},
		listeners: {
		    prefetch: 'updateLayout',
		    refresh: 'refresh',
		},
	    },
	},
    },

    bind: {
	store: '{bufferedstore}',
    },

    dockedItems: [
	{
	    xtype: 'toolbar',
	    items: [
		{
		    xtype: 'proxmoxButton',
		    text: gettext('View'),
		    iconCls: 'fa fa-window-restore',
		    disabled: true,
		    handler: 'showTaskLog',
		},
		{
		    xtype: 'button',
		    text: gettext('Reload'),
		    iconCls: 'fa fa-refresh',
		    handler: 'reload',
		},
		'->',
		{
		    xtype: 'button',
		    bind: {
			text: '{clearFilterText}',
			disabled: '{!filterCount}',
		    },
		    text: gettext('Clear Filter'),
		    enabled: false,
		    handler: 'clearFilter',
		},
		{
		    xtype: 'button',
		    enableToggle: true,
		    bind: {
			iconCls: '{filterIcon}',
		    },
		    text: gettext('Filter'),
		    stateful: true,
		    stateId: 'task-showfilter',
		    stateEvents: ['toggle'],
		    applyState: function(state) {
			if (state.pressed !== undefined) {
			    this.setPressed(state.pressed);
			}
		    },
		    getState: function() {
			return {
			    pressed: this.pressed,
			};
		    },
		    listeners: {
			toggle: 'showFilter',
		    },
		},
	    ],
	},
	{
	    xtype: 'toolbar',
	    dock: 'top',
	    reference: 'filtertoolbar',
	    layout: {
		type: 'hbox',
		align: 'top',
	    },
	    bind: {
		hidden: '{!showFilter}',
	    },
	    items: [
		{
		    xtype: 'container',
		    padding: 10,
		    layout: {
			type: 'vbox',
			align: 'stretch',
		    },
		    defaults: {
			labelWidth: 80,
		    },
		    // cannot bind the values directly, as it then changes also
		    // on blur, causing wrong reloads of the store
		    items: [
			{
			    xtype: 'datefield',
			    fieldLabel: gettext('Since'),
			    format: 'Y-m-d',
			    bind: {
				maxValue: '{until}',
			    },
			    listeners: {
				change: 'sinceChange',
			    },
			},
			{
			    xtype: 'datefield',
			    fieldLabel: gettext('Until'),
			    format: 'Y-m-d',
			    bind: {
				minValue: '{since}',
			    },
			    listeners: {
				change: 'untilChange',
			    },
			},
		    ],
		},
		{
		    xtype: 'container',
		    padding: 10,
		    layout: {
			type: 'vbox',
			align: 'stretch',
		    },
		    defaults: {
			labelWidth: 80,
		    },
		    items: [
			{
			    xtype: 'pmxTaskTypeSelector',
			    fieldLabel: gettext('Task Type'),
			    emptyText: gettext('All'),
			    bind: {
				value: '{typefilter}',
			    },
			},
			{
			    xtype: 'combobox',
			    fieldLabel: gettext('Task Result'),
			    emptyText: gettext('All'),
			    multiSelect: true,
			    store: [
				['ok', gettext('OK')],
				['unknown', Proxmox.Utils.unknownText],
				['warning', gettext('Warnings')],
				['error', gettext('Errors')],
			    ],
			    bind: {
				value: '{statusfilter}',
			    },
			},
		    ],
		},
	    ],
	},
    ],

    viewConfig: {
	trackOver: false,
	stripeRows: false, // does not work with getRowClass()
	emptyText: gettext('No Tasks found'),

	getRowClass: function(record, index) {
	    let status = record.get('status');

	    if (status) {
		let parsed = Proxmox.Utils.parse_task_status(status);
		if (parsed === 'error') {
		    return "proxmox-invalid-row";
		} else if (parsed === 'warning') {
		    return "proxmox-warning-row";
		}
	    }
	    return '';
	},
    },

    columns: [
	{
	    header: gettext("Start Time"),
	    dataIndex: 'starttime',
	    width: 130,
	    renderer: function(value) {
		return Ext.Date.format(value, "M d H:i:s");
	    },
	},
	{
	    header: gettext("End Time"),
	    dataIndex: 'endtime',
	    width: 130,
	    renderer: function(value, metaData, record) {
		if (!value) {
		    metaData.tdCls = "x-grid-row-loading";
		    return '';
		}
		return Ext.Date.format(value, "M d H:i:s");
	    },
	},
	{
	    header: gettext("Duration"),
	    hidden: true,
	    width: 80,
	    renderer: function(value, metaData, record) {
		let start = record.data.starttime;
		if (start) {
		    let end = record.data.endtime || Date.now();
		    let duration = end - start;
		    if (duration > 0) {
			duration /= 1000;
		    }
		    return Proxmox.Utils.format_duration_human(duration);
		}
		return Proxmox.Utils.unknownText;
	    },
	},
	{
	    header: gettext("User name"),
	    dataIndex: 'user',
	    width: 150,
	},
	{
	    header: gettext("Description"),
	    dataIndex: 'upid',
	    flex: 1,
	    renderer: Proxmox.Utils.render_upid,
	},
	{
	    header: gettext("Status"),
	    dataIndex: 'status',
	    width: 200,
	    renderer: function(value, metaData, record) {
		if (value === undefined && !record.data.endtime) {
		    metaData.tdCls = "x-grid-row-loading";
		    return '';
		}

		return Proxmox.Utils.format_task_status(value);
	    },
	},
    ],

    initComponent: function() {
	const me = this;

	let nodename = me.nodename || 'localhost';
	let url = me.url || `/api2/json/nodes/${nodename}/tasks`;
	me.getViewModel().set('url', url);

	let updateExtraFilters = function(name, value) {
	    let vm = me.getViewModel();
	    let extraFilter = Ext.clone(vm.get('extraFilter'));
	    extraFilter[name] = value;
	    vm.set('extraFilter', extraFilter);
	};

	for (const [name, value] of Object.entries(me.preFilter)) {
	    updateExtraFilters(name, value);
	}

	me.getViewModel().set('preFilter', me.preFilter);

	me.callParent();

	let addFields = function(items) {
	    me.lookup('filtertoolbar').add({
		xtype: 'container',
		padding: 10,
		layout: {
		    type: 'vbox',
		    align: 'stretch',
		},
		defaults: {
		    labelWidth: 80,
		},
		items,
	    });
	};

	// start with a userfilter
	me.extraFilter = [
	    {
		xtype: 'textfield',
		fieldLabel: gettext('User name'),
		changeOptions: {
		    buffer: 500,
		},
		name: 'userfilter',
	    },
	    ...me.extraFilter,
	];
	let items = [];
	for (const filterTemplate of me.extraFilter) {
	    let filter = Ext.clone(filterTemplate);

	    filter.listeners = filter.listeners || {};
	    filter.listeners.change = Ext.apply(filter.changeOptions || {}, {
		fn: function(field, value) {
		    updateExtraFilters(filter.name, value);
		},
	    });

	    items.push(filter);
	    if (items.length === 2) {
		addFields(items);
		items = [];
	    }
	}

	addFields(items);
    },
});

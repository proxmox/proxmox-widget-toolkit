Ext.define('apt-repolist', {
    extend: 'Ext.data.Model',
    fields: [
	'Path',
	'Index',
	'OfficialHost',
	'FileType',
	'Enabled',
	'Comment',
	'Types',
	'URIs',
	'Suites',
	'Components',
	'Options',
    ],
});

Ext.define('Proxmox.node.APTRepositoriesErrors', {
    extend: 'Ext.grid.GridPanel',

    xtype: 'proxmoxNodeAPTRepositoriesErrors',

    title: gettext('Errors'),

    store: {},

    viewConfig: {
	stripeRows: false,
	getRowClass: () => 'proxmox-invalid-row',
    },

    columns: [
	{
	    header: gettext('File'),
	    dataIndex: 'path',
	    renderer: value => `<i class='pve-grid-fa fa fa-fw fa-exclamation-triangle'></i>${value}`,
	    width: 350,
	},
	{
	    header: gettext('Error'),
	    dataIndex: 'error',
	    flex: 1,
	},
    ],
});

Ext.define('Proxmox.node.APTRepositoriesGrid', {
    extend: 'Ext.grid.GridPanel',
    xtype: 'proxmoxNodeAPTRepositoriesGrid',

    title: gettext('APT Repositories'),

    cls: 'proxmox-apt-repos', // to allow applying styling to general components with local effect

    tbar: [
	{
	    text: gettext('Reload'),
	    iconCls: 'fa fa-refresh',
	    handler: function() {
		let me = this;
		me.up('proxmoxNodeAPTRepositories').reload();
	    },
	},
	{
	    text: gettext('Add'),
	    menu: {
		plain: true,
		itemId: "addMenu",
		items: [],
	    },
	},
	'-',
	{
	    xtype: 'proxmoxButton',
	    text: gettext('Enable'),
	    defaultText: gettext('Enable'),
	    altText: gettext('Disable'),
	    id: 'repoEnableButton',
	    disabled: true,
	    handler: function(button, event, record) {
		let me = this;
		let panel = me.up('proxmoxNodeAPTRepositories');

		let params = {
		    path: record.data.Path,
		    index: record.data.Index,
		    enabled: record.data.Enabled ? 0 : 1, // invert
		};

		if (panel.digest !== undefined) {
		   params.digest = panel.digest;
		}

		Proxmox.Utils.API2Request({
		    url: `/nodes/${panel.nodename}/apt/repositories`,
		    method: 'POST',
		    params: params,
		    failure: function(response, opts) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
			panel.reload();
		    },
		    success: function(response, opts) {
			panel.reload();
		    },
		});
	    },
	    listeners: {
		render: function(btn) {
		    // HACK: calculate the max button width on first render to avoid toolbar glitches
		    let defSize = btn.getSize().width;

		    btn.setText(btn.altText);
		    let altSize = btn.getSize().width;

		    btn.setText(btn.defaultText);
		    btn.setSize({ width: altSize > defSize ? altSize : defSize });
		},
	    },
	},
    ],

    sortableColumns: false,

    columns: [
	{
	    header: gettext('Official'),
	    dataIndex: 'OfficialHost',
	    renderer: function(value, cell, record) {
		let icon = (cls) => `<i class="fa fa-fw ${cls}"></i>`;

		const enabled = record.data.Enabled;

		if (value === undefined || value === null) {
		    return icon('fa-question-circle-o');
		}
		if (!value) {
		    return icon('fa-times ' + (enabled ? 'critical' : 'faded'));
		}
		return icon('fa-check ' + (enabled ? 'good' : 'faded'));
	    },
	    width: 70,
	},
	{
	    header: gettext('Enabled'),
	    dataIndex: 'Enabled',
	    renderer: Proxmox.Utils.format_enabled_toggle,
	    width: 90,
	},
	{
	    header: gettext('Types'),
	    dataIndex: 'Types',
	    renderer: function(types, cell, record) {
		return types.join(' ');
	    },
	    width: 100,
	},
	{
	    header: gettext('URIs'),
	    dataIndex: 'URIs',
	    renderer: function(uris, cell, record) {
		return uris.join(' ');
	    },
	    width: 350,
	},
	{
	    header: gettext('Suites'),
	    dataIndex: 'Suites',
	    renderer: function(suites, cell, record) {
		return suites.join(' ');
	    },
	    width: 130,
	},
	{
	    header: gettext('Components'),
	    dataIndex: 'Components',
	    renderer: function(components, cell, record) {
		return components.join(' ');
	    },
	    width: 170,
	},
	{
	    header: gettext('Options'),
	    dataIndex: 'Options',
	    renderer: function(options, cell, record) {
		if (!options) {
		    return '';
		}

		let filetype = record.data.FileType;
		let text = '';

		options.forEach(function(option) {
		    let key = option.Key;
		    if (filetype === 'list') {
			let values = option.Values.join(',');
			text += `${key}=${values} `;
		    } else if (filetype === 'sources') {
			let values = option.Values.join(' ');
			text += `${key}: ${values}<br>`;
		    } else {
			throw "unkown file type";
		    }
		});
		return text;
	    },
	    flex: 1,
	},
	{
	    header: gettext('Comment'),
	    dataIndex: 'Comment',
	    flex: 2,
	},
    ],

    addAdditionalInfos: function(gridData, infos) {
	let me = this;

	let warnings = {};
	let officialHosts = {};

	let addLine = function(obj, key, line) {
	    if (obj[key]) {
		obj[key] += "\n";
		obj[key] += line;
	    } else {
		obj[key] = line;
	    }
	};

	for (const info of infos) {
	    const key = `${info.path}:${info.index}`;
	    if (info.kind === 'warning' ||
		(info.kind === 'ignore-pre-upgrade-warning' && !me.majorUpgradeAllowed)
	    ) {
		addLine(warnings, key, gettext('Warning') + ": " + info.message);
	    } else if (info.kind === 'badge' && info.message === 'official host name') {
		officialHosts[key] = true;
	    }
	}

	gridData.forEach(function(record) {
	    const key = `${record.Path}:${record.Index}`;
	    record.OfficialHost = !!officialHosts[key];
	});

	me.rowBodyFeature.getAdditionalData = function(innerData, rowIndex, record, orig) {
	    let headerCt = this.view.headerCt;
	    let colspan = headerCt.getColumnCount();

	    const key = `${innerData.Path}:${innerData.Index}`;
	    const warning_text = warnings[key];

	    return {
		rowBody: '<div style="color: red; white-space: pre-line">' +
		    Ext.String.htmlEncode(warning_text) + '</div>',
		rowBodyCls: warning_text ? '' : Ext.baseCSSPrefix + 'grid-row-body-hidden',
		rowBodyColspan: colspan,
	    };
	};
    },

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	let store = Ext.create('Ext.data.Store', {
	    model: 'apt-repolist',
	    groupField: 'Path',
	    sorters: [
		{
		    property: 'Index',
		    direction: 'ASC',
		},
	    ],
	});

	let rowBodyFeature = Ext.create('Ext.grid.feature.RowBody', {});

	let groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
	    groupHeaderTpl: '{[ "File: " + values.name ]} ({rows.length} ' +
		'repositor{[values.rows.length > 1 ? "ies" : "y"]})',
	    enableGroupingMenu: false,
	});

	let sm = Ext.create('Ext.selection.RowModel', {});

	Ext.apply(me, {
	    store: store,
	    selModel: sm,
	    rowBodyFeature: rowBodyFeature,
	    features: [groupingFeature, rowBodyFeature],
	});

	me.callParent();
    },

    listeners: {
	selectionchange: function() {
	    let me = this;

	    if (me.onSelectionChange) {
		let sm = me.getSelectionModel();
		let rec = sm.getSelection()[0];

		me.onSelectionChange(rec, sm);
	    }
	},
    },
});

Ext.define('Proxmox.node.APTRepositories', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeAPTRepositories',
    mixins: ['Proxmox.Mixin.CBind'],

    digest: undefined,

    product: 'Proxmox VE', // default

    viewModel: {
	data: {
	    product: 'Proxmox VE', // default
	    errorCount: 0,
	    subscriptionActive: '',
	    noSubscriptionRepo: '',
	    enterpriseRepo: '',
	},
	formulas: {
	    noErrors: (get) => get('errorCount') === 0,
	    mainWarning: function(get) {
		// Not yet initialized
		if (get('subscriptionActive') === '' ||
		    get('enterpriseRepo') === '') {
		    return '';
		}

		let icon = `<i class='fa fa-fw fa-exclamation-triangle critical'></i>`;
		let fmt = (msg) => `<div class="black">${icon}${gettext('Warning')}: ${msg}</div>`;

		if (!get('subscriptionActive') && get('enterpriseRepo')) {
		    return fmt(gettext('The enterprise repository is enabled, but there is no active subscription!'));
		}

		if (get('noSubscriptionRepo')) {
		    return fmt(gettext('The no-subscription repository is not recommended for production use!'));
		}

		if (!get('enterpriseRepo') && !get('noSubscriptionRepo')) {
		    let msg = Ext.String.format(gettext('No {0} repository is enabled!'), get('product'));
		    return fmt(msg);
		}

		return '';
	    },
	},
    },

    items: [
	{
	    title: gettext('Warning'),
	    name: 'repositoriesMainWarning',
	    xtype: 'panel',
	    bind: {
		title: '{mainWarning}',
		hidden: '{!mainWarning}',
	    },
	},
	{
	    xtype: 'proxmoxNodeAPTRepositoriesErrors',
	    name: 'repositoriesErrors',
	    hidden: true,
	    bind: {
		hidden: '{noErrors}',
	    },
	},
	{
	    xtype: 'proxmoxNodeAPTRepositoriesGrid',
	    name: 'repositoriesGrid',
	    cbind: {
		nodename: '{nodename}',
	    },
	    majorUpgradeAllowed: false, // TODO get release information from an API call?
	    onSelectionChange: function(rec, sm) {
		let me = this;
		if (rec) {
		    let btn = me.up('proxmoxNodeAPTRepositories').down('#repoEnableButton');
		    btn.setText(rec.get('Enabled') ? gettext('Disable') : gettext('Enable'));
		}
	    },
	},
    ],

    check_subscription: function() {
	let me = this;
	let vm = me.getViewModel();

	Proxmox.Utils.API2Request({
	    url: `/nodes/${me.nodename}/subscription`,
	    method: 'GET',
	    failure: (response, opts) => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
	    success: function(response, opts) {
		const res = response.result;
		const subscription = !(!res || !res.data || res.data.status.toLowerCase() !== 'active');
		vm.set('subscriptionActive', subscription);
	    },
	});
    },

    updateStandardRepos: function(standardRepos) {
	let me = this;
	let vm = me.getViewModel();

	let menu = me.down('#addMenu');
	menu.removeAll();

	for (const standardRepo of standardRepos) {
	    const handle = standardRepo.handle;
	    const status = standardRepo.status;

	    if (handle === "enterprise") {
		vm.set('enterpriseRepo', status);
	    } else if (handle === "no-subscription") {
		vm.set('noSubscriptionRepo', status);
	    }

	    let status_text = '';
	    if (status !== undefined && status !== null) {
		status_text = Ext.String.format(
		    ' ({0}, {1})',
		    gettext('configured'),
		    status ? gettext('enabled') : gettext('disabled'),
		);
	    }

	    menu.add({
		text: standardRepo.name + status_text,
		disabled: status !== undefined && status !== null,
		repoHandle: handle,
		handler: function(menuItem) {
		    Proxmox.Utils.checked_command(() => {
			let params = {
			    handle: menuItem.repoHandle,
			};

			if (me.digest !== undefined) {
			    params.digest = me.digest;
			}

			Proxmox.Utils.API2Request({
			    url: `/nodes/${me.nodename}/apt/repositories`,
			    method: 'PUT',
			    params: params,
			    failure: function(response, opts) {
				Ext.Msg.alert(gettext('Error'), response.htmlStatus);
				me.reload();
			    },
			    success: function(response, opts) {
				me.reload();
			    },
			});
		    });
		},
	    });
	}
    },

    reload: function() {
	let me = this;
	let vm = me.getViewModel();
	let repoGrid = me.down('proxmoxNodeAPTRepositoriesGrid');
	let errorGrid = me.down('proxmoxNodeAPTRepositoriesErrors');

	me.store.load(function(records, operation, success) {
	    let gridData = [];
	    let errors = [];
	    let digest;

	    if (success && records.length > 0) {
		let data = records[0].data;
		let files = data.files;
		errors = data.errors;
		digest = data.digest;

		files.forEach(function(file) {
		    for (let n = 0; n < file.repositories.length; n++) {
			let repo = file.repositories[n];
			repo.Path = file.path;
			repo.Index = n;
			gridData.push(repo);
		    }
		});

		repoGrid.addAdditionalInfos(gridData, data.infos);
		repoGrid.store.loadData(gridData);

		me.updateStandardRepos(data['standard-repos']);
	    }

	    me.digest = digest;

	    vm.set('errorCount', errors.length);
	    errorGrid.store.loadData(errors);
	});

	me.check_subscription();
    },

    listeners: {
	activate: function() {
	    let me = this;
	    me.reload();
	},
    },

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	let store = Ext.create('Ext.data.Store', {
	    proxy: {
		type: 'proxmox',
		url: `/api2/json/nodes/${me.nodename}/apt/repositories`,
	    },
	});

	Ext.apply(me, { store: store });

	Proxmox.Utils.monStoreErrors(me, me.store, true);

	me.callParent();

	me.getViewModel().set('product', me.product);
    },
});

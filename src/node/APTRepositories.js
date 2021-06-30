Ext.define('apt-repolist', {
    extend: 'Ext.data.Model',
    fields: [
	'Path',
	'Index',
	'Origin',
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

Ext.define('Proxmox.window.APTRepositoryAdd', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pmxAPTRepositoryAdd',

    isCreate: true,
    isAdd: true,

    subject: gettext('Repository'),
    width: 600,

    initComponent: function() {
	let me = this;

	if (!me.repoInfo || me.repoInfo.length === 0) {
	    throw "repository information not initialized";
	}

	let description = Ext.create('Ext.form.field.Display', {
	    fieldLabel: gettext('Description'),
	    name: 'description',
	});

	let status = Ext.create('Ext.form.field.Display', {
	    fieldLabel: gettext('Status'),
	    name: 'status',
	    renderer: function(value) {
		let statusText = gettext('Not yet configured');
		if (value !== '') {
		    statusText = Ext.String.format(
			'{0}: {1}',
			gettext('Configured'),
			value ? gettext('enabled') : gettext('disabled'),
		    );
		}

		return statusText;
	    },
	});

	let repoSelector = Ext.create('Proxmox.form.KVComboBox', {
	    fieldLabel: gettext('Repository'),
	    xtype: 'proxmoxKVComboBox',
	    name: 'handle',
	    allowBlank: false,
	    comboItems: me.repoInfo.map(info => [info.handle, info.name]),
	    isValid: function() {
		const handle = this.value;

		if (!handle) {
		    return false;
		}

		const info = me.repoInfo.find(elem => elem.handle === handle);

		if (!info) {
		    return false;
		}

		// not yet configured
		return info.status === undefined || info.status === null;
	    },
	    listeners: {
		change: function(f, value) {
		    const info = me.repoInfo.find(elem => elem.handle === value);
		    description.setValue(info.description);
		    status.setValue(info.status);
		},
	    },
	});

	repoSelector.setValue(me.repoInfo[0].handle);

	Ext.apply(me, {
	    items: [
		repoSelector,
		description,
		status,
	    ],
	    repoSelector: repoSelector,
	});

	me.callParent();
    },
});

Ext.define('Proxmox.node.APTRepositoriesErrors', {
    extend: 'Ext.grid.GridPanel',

    xtype: 'proxmoxNodeAPTRepositoriesErrors',

    title: gettext('Errors'),

    store: {},

    border: false,

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

    border: false,

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
	    id: 'addButton',
	    disabled: true,
	    repoInfo: undefined,
	    handler: function(button, event, record) {
		Proxmox.Utils.checked_command(() => {
		    let me = this;
		    let panel = me.up('proxmoxNodeAPTRepositories');

		    let extraParams = {};
		    if (panel.digest !== undefined) {
		       extraParams.digest = panel.digest;
		    }

		    Ext.create('Proxmox.window.APTRepositoryAdd', {
			repoInfo: me.repoInfo,
			url: `/api2/json/nodes/${panel.nodename}/apt/repositories`,
			method: 'PUT',
			extraRequestParams: extraParams,
			listeners: {
			    destroy: function() {
				panel.reload();
			    },
			},
		    }).show();
		});
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
	    bind: {
		text: '{enableButtonText}',
	    },
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
    viewConfig: {
	stripeRows: false,
	getRowClass: (record, index) => record.get('Enabled') ? '' : 'proxmox-disabled-row',
    },

    columns: [
	{
	    xtype: 'checkcolumn',
	    header: gettext('Enabled'),
	    dataIndex: 'Enabled',
	    listeners: {
		beforecheckchange: () => false, // veto, we don't want to allow inline change - to subtle
	    },
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
	    renderer: function(suites, metaData, record) {
		let err = '';
		if (record.data.warnings && record.data.warnings.length > 0) {
		    let txt = [gettext('Warning')];
		    record.data.warnings.forEach((warning) => {
			if (warning.property === 'Suites') {
			    txt.push(warning.message);
			}
		    });
		    metaData.tdAttr = `data-qtip="${Ext.htmlEncode(txt.join('<br>'))}"`;
		    if (record.data.Enabled) {
			metaData.tdCls = 'proxmox-invalid-row';
			err = '<i class="fa fa-fw critical fa-exclamation-circle"></i> ';
		    } else {
			metaData.tdCls = 'proxmox-warning-row';
			err = '<i class="fa fa-fw warning fa-exclamation-circle"></i> ';
		    }
		}
		return suites.join(' ') + err;
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
	    header: gettext('Origin'),
	    dataIndex: 'Origin',
	    width: 120,
	    renderer: (value, meta, rec) => {
		if (typeof value !== 'string' || value.length === 0) {
		    value = gettext('Other');
		}
		let cls = 'fa fa-fw fa-question-circle-o';
		if (value.match(/^\s*Proxmox\s*$/i)) {
		    cls = 'pmx-itype-icon pmx-itype-icon-proxmox-x';
		} else if (value.match(/^\s*Debian\s*$/i)) {
		    cls = 'pmx-itype-icon pmx-itype-icon-debian-swirl';
		}
		return `<i class='${cls}'></i> ${value}`;
	    },
	},
	{
	    header: gettext('Comment'),
	    dataIndex: 'Comment',
	    flex: 2,
	},
    ],

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

	let groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
	    groupHeaderTpl: '{[ "File: " + values.name ]} ({rows.length} ' +
		'repositor{[values.rows.length > 1 ? "ies" : "y"]})',
	    enableGroupingMenu: false,
	});

	Ext.apply(me, {
	    store: store,
	    features: [groupingFeature],
	});

	me.callParent();
    },
});

Ext.define('Proxmox.node.APTRepositories', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeAPTRepositories',
    mixins: ['Proxmox.Mixin.CBind'],

    digest: undefined,

    product: 'Proxmox VE', // default

    controller: {
	xclass: 'Ext.app.ViewController',

	selectionChange: function(grid, selection) {
	    let me = this;
	    if (!selection || selection.length < 1) {
		return;
	    }
	    let rec = selection[0];
	    let vm = me.getViewModel();
	    vm.set('selectionenabled', rec.get('Enabled'));
	},
    },

    viewModel: {
	data: {
	    product: 'Proxmox VE', // default
	    errorCount: 0,
	    subscriptionActive: '',
	    noSubscriptionRepo: '',
	    enterpriseRepo: '',
	    selectionenabled: false,
	},
	formulas: {
	    noErrors: (get) => get('errorCount') === 0,
	    enableButtonText: (get) => get('selectionenabled')
		? gettext('Disable') : gettext('Enable'),
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

    scrollable: true,
    layout: {
	type: 'vbox',
	align: 'stretch',
    },

    items: [
	{
	    xtype: 'header',
	    baseCls: 'x-panel-header',
	    bind: {
		hidden: '{!mainWarning}',
		title: '{mainWarning}',
	    },
	},
	{
	    xtype: 'box',
	    bind: {
		hidden: '{!mainWarning}',
	    },
	    height: 5,
	},
	{
	    xtype: 'proxmoxNodeAPTRepositoriesErrors',
	    name: 'repositoriesErrors',
	    hidden: true,
	    padding: '0 0 5 0',
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
	    listeners: {
		selectionchange: 'selectionChange',
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

	let addButton = me.down('#addButton');
	addButton.repoInfo = [];

	for (const standardRepo of standardRepos) {
	    const handle = standardRepo.handle;
	    const status = standardRepo.status;

	    if (handle === "enterprise") {
		vm.set('enterpriseRepo', status);
	    } else if (handle === "no-subscription") {
		vm.set('noSubscriptionRepo', status);
	    }

	    addButton.repoInfo.push(standardRepo);
	    addButton.digest = me.digest;
	}

	addButton.setDisabled(false);
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

		let infos = {};
		for (const info of data.infos) {
		    let path = info.path;
		    let idx = info.index;

		    if (!infos[path]) {
			infos[path] = {};
		    }
		    if (!infos[path][idx]) {
			infos[path][idx] = {
			    origin: '',
			    warnings: [],
			};
		    }

		    if (info.kind === 'origin') {
			infos[path][idx].origin = info.message;
		    } else if (info.kind === 'warning' ||
			(info.kind === 'ignore-pre-upgrade-warning' && !repoGrid.majorUpgradeAllowed)
		    ) {
			infos[path][idx].warnings.push(info);
		    } else {
			throw 'unknown info';
		    }
		}


		files.forEach(function(file) {
		    for (let n = 0; n < file.repositories.length; n++) {
			let repo = file.repositories[n];
			repo.Path = file.path;
			repo.Index = n;
			if (infos[file.path] && infos[file.path][n]) {
			    repo.Origin = infos[file.path][n].origin || Proxmox.Utils.UnknownText;
			    repo.warnings = infos[file.path][n].warnings || [];
			}
			gridData.push(repo);
		    }
		});

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

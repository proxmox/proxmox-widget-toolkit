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
	    validator: function(renderedValue) {
		let handle = this.value;
		// we cannot use this.callParent in instantiations
		let valid = Proxmox.form.KVComboBox.prototype.validator.call(this, renderedValue);

		if (!valid || !handle) {
		    return false;
		}

		const info = me.repoInfo.find(elem => elem.handle === handle);
		if (!info) {
		    return false;
		}

		if (info.status) {
		    return Ext.String.format(gettext('{0} is already configured'), renderedValue);
		}
		return valid;
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

    store: {},

    scrollable: true,

    viewConfig: {
	stripeRows: false,
	getRowClass: (record) => {
	    switch (record.data.status) {
		case 'warning': return 'proxmox-warning-row';
		case 'critical': return 'proxmox-invalid-row';
		default: return '';
	    }
	},
    },

    hideHeaders: true,

    columns: [
	{
	    dataIndex: 'status',
	    renderer: (value) => `<i class="fa fa-fw ${Proxmox.Utils.get_health_icon(value, true)}"></i>`,
	    width: 50,
	},
	{
	    dataIndex: 'message',
	    flex: 1,
	},
    ],
});

Ext.define('Proxmox.node.APTRepositoriesGrid', {
    extend: 'Ext.grid.GridPanel',
    xtype: 'proxmoxNodeAPTRepositoriesGrid',
    mixins: ['Proxmox.Mixin.CBind'],

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
	    name: 'addRepo',
	    disabled: true,
	    repoInfo: undefined,
	    cbind: {
		onlineHelp: '{onlineHelp}',
	    },
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
			url: `/api2/extjs/nodes/${panel.nodename}/apt/repositories`,
			method: 'PUT',
			extraRequestParams: extraParams,
			onlineHelp: me.onlineHelp,
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
	    xtype: 'proxmoxAltTextButton',
	    defaultText: gettext('Enable'),
	    altText: gettext('Disable'),
	    name: 'repoEnable',
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
	},
    ],

    sortableColumns: false,
    viewConfig: {
	stripeRows: false,
	getRowClass: (record, index) => record.get('Enabled') ? '' : 'proxmox-disabled-row',
    },

    columns: [
	{
	    header: gettext('Enabled'),
	    dataIndex: 'Enabled',
	    align: 'center',
	    renderer: Proxmox.Utils.renderEnabledIcon,
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
	    renderer: function(components, metaData, record) {
		if (components === undefined) {
		    return '';
		}
		let err = '';
		if (components.length === 1) {
		    // FIXME: this should be a flag set to the actual repsotiories, i.e., a tristate
		    // like production-ready = <yes|no|other> (Option<bool>)
		    if (components[0].match(/\w+(-no-subscription|test)\s*$/i)) {
			metaData.tdCls = 'proxmox-warning-row';
			err = '<i class="fa fa-fw warning fa-exclamation-circle"></i> ';

			let qtip = components[0].match(/no-subscription/)
			    ? gettext('The no-subscription repository is NOT production-ready')
			    : gettext('The test repository may contain unstable updates')
			    ;
			    metaData.tdAttr = `data-qtip="${Ext.htmlEncode(qtip)}"`;
		    }
		}
		return components.join(' ') + err;
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
			throw "unknown file type";
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
		} else if (value.match(/^\s*Debian\s*(:?Backports)?$/i)) {
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

    features: [
	{
	    ftype: 'grouping',
	    groupHeaderTpl: '{[ "File: " + values.name ]} ({rows.length} repositor{[values.rows.length > 1 ? "ies" : "y"]})',
	    enableGroupingMenu: false,
	},
    ],

    store: {
	model: 'apt-repolist',
	groupField: 'Path',
	sorters: [
	    {
		property: 'Index',
		direction: 'ASC',
	    },
	],
    },

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	me.callParent();
    },
});

Ext.define('Proxmox.node.APTRepositories', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeAPTRepositories',
    mixins: ['Proxmox.Mixin.CBind'],

    digest: undefined,

    onlineHelp: undefined,

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
	    vm.notify();
	},

	updateState: function() {
	    let me = this;
	    let vm = me.getViewModel();

	    let store = vm.get('errorstore');
	    store.removeAll();

	    let status = 'good'; // start with best, the helper below will downgrade if needed
	    let text = gettext('All OK, you have production-ready repositories configured!');

	    let addGood = message => store.add({ status: 'good', message });
	    let addWarn = (message, important) => {
		if (status !== 'critical') {
		    status = 'warning';
		    text = important ? message : gettext('Warning');
		}
		store.add({ status: 'warning', message });
	    };
	    let addCritical = (message, important) => {
		status = 'critical';
		text = important ? message : gettext('Error');
		store.add({ status: 'critical', message });
	    };

	    let errors = vm.get('errors');
	    errors.forEach(error => addCritical(`${error.path} - ${error.error}`));

	    let activeSubscription = vm.get('subscriptionActive');
	    let enterprise = vm.get('enterpriseRepo');
	    let nosubscription = vm.get('noSubscriptionRepo');
	    let test = vm.get('testRepo');
	    let wrongSuites = vm.get('suitesWarning');

	    if (!enterprise && !nosubscription && !test) {
		addCritical(
		    Ext.String.format(gettext('No {0} repository is enabled, you do not get any updates!'), vm.get('product')),
		);
	    } else if (errors.length > 0) {
		// nothing extra, just avoid that we show "get updates"
	    } else if (enterprise && !nosubscription && !test && activeSubscription) {
		addGood(Ext.String.format(gettext('You get supported updates for {0}'), vm.get('product')));
	    } else if (nosubscription || test) {
		addGood(Ext.String.format(gettext('You get updates for {0}'), vm.get('product')));
	    }

	    if (wrongSuites) {
		addWarn(gettext('Some suites are misconfigured'));
	    }

	    if (!activeSubscription && enterprise) {
		addWarn(gettext('The enterprise repository is enabled, but there is no active subscription!'));
	    }

	    if (nosubscription) {
		addWarn(gettext('The no-subscription repository is not recommended for production use!'));
	    }

	    if (test) {
		addWarn(gettext('The test repository may pull in unstable updates and is not recommended for production use!'));
	    }

	    if (errors.length > 0) {
		text = gettext('Fatal parsing error for at least one repository');
	    }

	    let iconCls = Proxmox.Utils.get_health_icon(status, true);

	    vm.set('state', {
		iconCls,
		text,
	    });
	},
    },

    viewModel: {
	data: {
	    product: 'Proxmox VE', // default
	    errors: [],
	    suitesWarning: false,
	    subscriptionActive: '',
	    noSubscriptionRepo: '',
	    enterpriseRepo: '',
	    testRepo: '',
	    selectionenabled: false,
	    state: {},
	},
	formulas: {
	    enableButtonText: (get) => get('selectionenabled')
		? gettext('Disable') : gettext('Enable'),
	},
	stores: {
	    errorstore: {
		fields: ['status', 'message'],
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
	    xtype: 'panel',
	    border: false,
	    layout: {
		type: 'hbox',
		align: 'stretch',
	    },
	    height: 200,
	    title: gettext('Status'),
	    items: [
		{
		    xtype: 'box',
		    flex: 2,
		    margin: 10,
		    data: {
			iconCls: Proxmox.Utils.get_health_icon(undefined, true),
			text: '',
		    },
		    bind: {
			data: '{state}',
		    },
		    tpl: [
			'<center class="centered-flex-column" style="font-size:15px;line-height: 25px;">',
			'<i class="fa fa-4x {iconCls}"></i>',
			'{text}',
			'</center>',
		    ],
		},
		{
		    xtype: 'proxmoxNodeAPTRepositoriesErrors',
		    name: 'repositoriesErrors',
		    flex: 7,
		    margin: 10,
		    bind: {
			store: '{errorstore}',
		    },
		},
	    ],
	},
	{
	    xtype: 'proxmoxNodeAPTRepositoriesGrid',
	    name: 'repositoriesGrid',
	    flex: 1,
	    cbind: {
		nodename: '{nodename}',
		onlineHelp: '{onlineHelp}',
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
		me.getController().updateState();
	    },
	});
    },

    updateStandardRepos: function(standardRepos) {
	let me = this;
	let vm = me.getViewModel();

	let addButton = me.down('button[name=addRepo]');

	addButton.repoInfo = [];
	for (const standardRepo of standardRepos) {
	    const handle = standardRepo.handle;
	    const status = standardRepo.status;

	    if (handle === "enterprise") {
		vm.set('enterpriseRepo', status);
	    } else if (handle === "no-subscription") {
		vm.set('noSubscriptionRepo', status);
	    } else if (handle === 'test') {
		vm.set('testRepo', status);
	    }
	    me.getController().updateState();

	    addButton.repoInfo.push(standardRepo);
	    addButton.digest = me.digest;
	}

	addButton.setDisabled(false);
    },

    reload: function() {
	let me = this;
	let vm = me.getViewModel();
	let repoGrid = me.down('proxmoxNodeAPTRepositoriesGrid');

	me.store.load(function(records, operation, success) {
	    let gridData = [];
	    let errors = [];
	    let digest;
	    let suitesWarning = false;

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

			    if (repo.Enabled && repo.warnings.some(w => w.property === 'Suites')) {
				suitesWarning = true;
			    }
			}
			gridData.push(repo);
		    }
		});

		repoGrid.store.loadData(gridData);

		me.updateStandardRepos(data['standard-repos']);
	    }

	    me.digest = digest;

	    vm.set('errors', errors);
	    vm.set('suitesWarning', suitesWarning);
	    me.getController().updateState();
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

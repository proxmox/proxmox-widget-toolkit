Ext.define('pmx-apt-history', {
    extend: 'Ext.data.Model',
    fields: [
        'start-time',
        { name: 'start-index', type: 'integer', defaultValue: 0 },
        'end-time',
        // default to empty strings so that sorting by these does not compare undefined values
        { name: 'command-line', defaultValue: '' },
        { name: 'requested-by', defaultValue: '' },
        { name: 'comment', defaultValue: '' },
        { name: 'error', defaultValue: '' },
        'packages',
        {
            name: 'duration',
            calculate: (data) =>
                data['end-time'] === undefined ? -1 : data['end-time'] - data['start-time'],
        },
        {
            // ranks the status for sorting, see renderStatus
            name: 'status',
            calculate: (data) => {
                if (data.error) {
                    return 2;
                }
                return data['end-time'] === undefined ? 1 : 0;
            },
        },
    ],
    idProperty: 'id',
});

Ext.define('Proxmox.node.APTHistorySummary', {
    extend: 'Ext.Component',

    cls: 'pmx-apt-history-summary',
    padding: '5 10',

    listeners: {
        resize: (summary) => summary.updateCommandToggle(),
    },

    afterRender: function () {
        let me = this;
        me.callParent();
        me.mon(me.getEl(), {
            click: (event) => {
                if (event.getTarget('.pmx-apt-history-command-toggle')) {
                    me.setCommandExpanded(!me.commandExpanded);
                } else if (
                    !me.commandExpanded &&
                    event.getTarget('.pmx-expandable > .pmx-apt-history-command-text') &&
                    window.getSelection().isCollapsed // not the end of selecting text
                ) {
                    me.setCommandExpanded(true);
                }
            },
            keydown: (event) => {
                let key = event.getKey();
                if (
                    event.getTarget('.pmx-apt-history-command-toggle') &&
                    (key === event.ENTER || key === event.SPACE)
                ) {
                    event.preventDefault();
                    me.setCommandExpanded(!me.commandExpanded);
                }
            },
        });
    },

    setCommandExpanded: function (expanded) {
        let me = this;
        me.commandExpanded = expanded;
        me.updateCommandToggle();
        me.updateLayout();
    },

    // only a command line that does not fit into its line can be expanded
    updateCommandToggle: function () {
        let me = this;
        let line = me.getEl()?.dom.querySelector('.pmx-apt-history-command');
        if (!line) {
            return;
        }
        let text = line.querySelector('.pmx-apt-history-command-text');
        let toggle = line.querySelector('.pmx-apt-history-command-toggle');
        let expanded = !!me.commandExpanded;
        line.classList.toggle('pmx-expanded', expanded);
        // measure without the toggle, which takes some of the width
        line.classList.remove('pmx-expandable');
        line.classList.toggle('pmx-expandable', expanded || text.scrollWidth > text.clientWidth);
        let label = expanded ? gettext('Collapse') : gettext('Expand');
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.setAttribute('aria-label', label);
        toggle.dataset.qtip = label;
    },

    setTransaction: function (rec) {
        let me = this;
        let H = Proxmox.node.APTUtils;
        // a reload keeps an expanded command line, another transaction starts collapsed
        let key = rec ? `${rec.data['start-time']}:${rec.data['start-index']}` : undefined;
        if (key !== me.transactionKey) {
            me.transactionKey = key;
            me.commandExpanded = false;
        }
        if (!rec) {
            me.update('');
            return;
        }
        let { data } = rec;
        let command = Ext.htmlEncode(data['command-line']) || '-';
        let info = [H.renderChanges(data.packages)];
        if (data['requested-by']) {
            info.push(
                Ext.String.format(
                    gettext('Requested by {0}'),
                    Ext.htmlEncode(data['requested-by']),
                ),
            );
        }
        if (data.comment) {
            info.push(Ext.htmlEncode(data.comment));
        }
        let infoHtml = info.filter((part) => part).join(' &middot; ');
        let statusTip = data.error
            ? ` data-qtip="${Ext.htmlEncode(Ext.htmlEncode(data.error))}"`
            : '';
        let commandId = `${me.id}-command`;
        me.update(
            '<div class="pmx-apt-history-status">' +
                '<span class="pmx-apt-history-time"><i class="fa fa-fw fa-clock-o"></i> ' +
                `${Proxmox.Utils.render_timestamp(data['start-time'])}</span>` +
                '<span class="pmx-apt-history-duration">' +
                '<i class="fa fa-fw fa-hourglass-half"></i> ' +
                `${H.durationText(data)}</span>` +
                `<span${statusTip}>${H.statusHtml(data)}</span>` +
                '</div>' +
                '<div class="pmx-apt-history-command"><i class="fa fa-fw fa-terminal"></i>' +
                `<span id="${commandId}" class="pmx-apt-history-command-text">${command}</span>` +
                '<span class="fa fa-fw fa-caret-down pmx-apt-history-command-toggle" ' +
                `role="button" tabindex="0" aria-controls="${commandId}"></span></div>` +
                `<div data-qtip="${Ext.htmlEncode(infoHtml)}">${infoHtml}</div>`,
        );
        me.updateCommandToggle();
    },
});

Ext.define('Proxmox.node.APTHistory', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeAPTHistory',

    layout: 'border',

    // set to false to disable showing the terminal output, e.g. without the privileges for it
    canShowTermLog: true,

    // allows changing whether the terminal output can be shown after creation, e.g. once the
    // privileges of the user are known
    setCanShowTermLog: function (canShowTermLog) {
        let me = this;
        me.canShowTermLog = canShowTermLog;
        let termLog = me.down('#termlog');
        let tabs = termLog.up('tabpanel');
        if (!canShowTermLog && tabs.getActiveTab() === termLog) {
            tabs.setActiveTab(0);
        }
        termLog.setDisabled(!canShowTermLog);
    },

    // the terms of the package filter, of which a package name must contain one
    packageTerms: [],

    matchingChanges: function (packages) {
        let terms = this.packageTerms;
        return (packages ?? []).filter((change) =>
            terms.some((term) => change.package.includes(term)),
        );
    },

    changesText: function (packages) {
        let me = this;
        let H = Proxmox.node.APTUtils;
        if (!me.packageTerms.length) {
            return H.renderChanges(packages);
        }
        let changes = me.matchingChanges(packages).map((change) => {
            let text = `${change.package} ${H.versionsText(change)}`;
            let action = H.actions[change.action]?.text ?? change.action;
            return change.action === 'upgrade' ? text : `${text} (${action})`;
        });
        return [...H.releaseChanges(packages), ...changes].join(', ');
    },

    showDetails: function (reload) {
        let me = this;
        let rec = me.historyGrid.getSelectionModel().getSelection()[0];
        me.placeholder.setHidden(!!rec);
        me.summary.setHidden(!rec);
        me.tabs.setHidden(!rec);
        me.summary.setTransaction(rec);
        me.tabs.items.each((tab) => tab.setTransaction(rec, reload));
    },

    deselectHidden: function () {
        let me = this;
        let sm = me.historyGrid.getSelectionModel();
        let selected = sm.getSelection()[0];
        if (selected && me.store.indexOf(selected) < 0) {
            sm.deselectAll();
        }
    },

    createStore: function () {
        let me = this;
        return Ext.create('Ext.data.Store', {
            model: 'pmx-apt-history',
            autoDestroy: true,
            proxy: {
                type: 'proxmox',
                url: `/api2/json/nodes/${me.nodename}/apt/history`,
                reader: {
                    type: 'json',
                    rootProperty: 'data',
                    responseType: undefined,
                    // transactions can start in the same second, and records get their id before
                    // any field conversion, so add it here
                    transform: (response) => {
                        for (const entry of response.data ?? []) {
                            entry.id = `${entry['start-time']}.${entry['start-index'] ?? 0}`;
                        }
                        return response;
                    },
                },
            },
            sorters: [
                { property: 'start-time', direction: 'DESC' },
                { property: 'start-index', direction: 'DESC' },
            ],
        });
    },

    createHistoryGrid: function () {
        let me = this;
        let H = Proxmox.node.APTUtils;
        return Ext.create('Ext.grid.Panel', {
            region: 'center',
            flex: 1,
            store: me.store,
            selModel: {
                listeners: {
                    selectionchange: () => me.showDetails(false),
                },
            },
            stateful: true,
            stateId: 'grid-apt-history',
            viewConfig: {
                emptyText: gettext('No APT history available.'),
            },
            columns: [
                {
                    header: gettext('Start Time'),
                    dataIndex: 'start-time',
                    width: 150,
                    renderer: Proxmox.Utils.render_timestamp,
                },
                {
                    header: gettext('Duration'),
                    dataIndex: 'duration',
                    width: 100,
                    renderer: H.renderDuration,
                },
                {
                    header: gettext('Command Line'),
                    dataIndex: 'command-line',
                    flex: 2,
                    renderer: H.renderWithTooltip,
                },
                {
                    header: gettext('Requested By'),
                    dataIndex: 'requested-by',
                    width: 100,
                    hidden: true,
                },
                {
                    header: gettext('Comment'),
                    dataIndex: 'comment',
                    flex: 1,
                    hidden: true,
                    renderer: H.renderWithTooltip,
                },
                {
                    header: gettext('Changes'),
                    dataIndex: 'packages',
                    flex: 3,
                    sortable: false,
                    renderer: (packages, meta) =>
                        H.renderWithTooltip(me.changesText(packages), meta),
                },
                {
                    header: gettext('Status'),
                    dataIndex: 'status',
                    flex: 1,
                    renderer: H.renderStatus,
                },
            ],
            listeners: {
                itemdblclick: () => {
                    if (me.canShowTermLog) {
                        me.tabs.setActiveTab(me.down('#termlog'));
                    }
                },
            },
        });
    },

    createPackageGrid: function () {
        let me = this;
        let H = Proxmox.node.APTUtils;
        // a removed package usually has no changelog installed anymore
        let hasChangelog = (rec) => !!rec?.data['new-version'];

        // shows the changes between the versions of a package change, also those that got
        // reverted by a downgrade, or all up to the version if it did not change, like for a
        // reinstall
        let showChangelog = function (rec) {
            let { action, package: packageName } = rec.data;
            let oldVersion = rec.data['old-version'];
            let newVersion = rec.data['new-version'];
            let changed = oldVersion !== newVersion;
            Ext.create('Proxmox.window.PackageChangelog', {
                nodename: me.nodename,
                packageName,
                sinceVersion: changed
                    ? { upgrade: oldVersion, downgrade: newVersion }[action]
                    : undefined,
                toVersion: action === 'downgrade' ? oldVersion : newVersion,
                autoShow: true,
            });
        };
        let packageSm = Ext.create('Ext.selection.RowModel');
        return Ext.create('Ext.grid.Panel', {
            itemId: 'packages',
            title: gettext('Packages'),
            store: {
                autoDestroy: true,
            },
            setTransaction: function (rec) {
                this.setEmptyText(rec ? gettext('No package changes recorded.') : '');
                this.getStore().setData(rec?.data.packages ?? []);
            },
            selModel: packageSm,
            tbar: [
                {
                    xtype: 'proxmoxButton',
                    text: gettext('Changelog'),
                    selModel: packageSm,
                    disabled: true,
                    enableFn: hasChangelog,
                    handler: (_button, _event, rec) => showChangelog(rec),
                },
            ],
            listeners: {
                itemdblclick: (_view, rec) => {
                    if (hasChangelog(rec)) {
                        showChangelog(rec);
                    }
                },
            },
            columns: [
                {
                    header: gettext('Action'),
                    dataIndex: 'action',
                    width: 90,
                    renderer: H.renderAction,
                },
                {
                    header: gettext('Package'),
                    dataIndex: 'package',
                    flex: 3,
                    minWidth: 120,
                    renderer: H.renderWithTooltip,
                },
                { header: gettext('Architecture'), dataIndex: 'arch', width: 100 },
                {
                    text: gettext('Version'),
                    flex: 4,
                    columns: [
                        {
                            header: gettext('old'),
                            dataIndex: 'old-version',
                            flex: 1,
                            minWidth: 100,
                            renderer: H.renderWithTooltip,
                        },
                        {
                            header: gettext('new'),
                            dataIndex: 'new-version',
                            flex: 1,
                            minWidth: 100,
                            renderer: H.renderWithTooltip,
                        },
                    ],
                },
                {
                    header: gettext('Automatic'),
                    dataIndex: 'automatic',
                    width: 85,
                    renderer: (value) => (value ? Proxmox.Utils.yesText : ''),
                },
            ],
        });
    },

    createFilters: function () {
        let me = this;
        let H = Proxmox.node.APTUtils;
        let statusFilter = Ext.create('Ext.button.Segmented', {
            value: 'all',
            items: [
                { text: gettext('All'), value: 'all' },
                { text: gettext('OK'), value: 'ok' },
                { text: gettext('Failed'), value: 'failed' },
                { text: gettext('Interrupted'), value: 'interrupted' },
            ],
            listeners: { change: () => applyFilters() },
        });
        let majorFilter = Ext.create('Ext.button.Button', {
            text: gettext('Major Upgrades'),
            tooltip: gettext('Only transactions that changed the major release of Debian or Ceph'),
            enableToggle: true,
            toggleHandler: () => applyFilters(),
        });
        let dateFilter = (label, listener) =>
            Ext.create('Ext.form.field.Date', {
                fieldLabel: label,
                labelWidth: 35,
                width: 180,
                format: 'Y-m-d',
                triggers: { clear: H.clearTrigger() },
                listeners: {
                    change: (field, value) => {
                        H.toggleClearTrigger(field, value);
                        listener(value);
                        applyFilters();
                    },
                },
            });
        let sinceFilter = dateFilter(gettext('Since'), (value) => untilFilter.setMinValue(value));
        let untilFilter = dateFilter(gettext('Until'), (value) => sinceFilter.setMaxValue(value));
        let textFilter = (emptyText, width) =>
            Ext.create('Ext.form.field.Text', {
                emptyText,
                width,
                triggers: { clear: H.clearTrigger() },
                listeners: {
                    change: {
                        fn: (field, value) => {
                            H.toggleClearTrigger(field, value);
                            applyFilters();
                        },
                        buffer: 250,
                    },
                },
            });
        let packageFilter = textFilter(gettext('Package names'), 160);
        let searchFilter = textFilter(gettext('Search command line or user'), 200);

        let statusRanks = { ok: 0, interrupted: 1, failed: 2 };
        let matchesSearch = (data, search) =>
            [data['command-line'], data['requested-by'], data.comment, data.error].some((value) =>
                value?.toLowerCase().includes(search),
            );
        let applyFilters = function () {
            let status = statusFilter.getValue();
            let majorOnly = majorFilter.pressed;
            let since = sinceFilter.getValue();
            let until = untilFilter.getValue();
            let search = searchFilter.getValue().trim().toLowerCase();
            me.packageTerms = packageFilter
                .getValue()
                .toLowerCase()
                .split(/[\s,]+/)
                .filter((term) => term);
            let sinceTime = since ? since.getTime() / 1000 : -Infinity;
            // until includes the whole day
            let untilTime = until
                ? Ext.Date.add(until, Ext.Date.DAY, 1).getTime() / 1000
                : Infinity;
            let filtered =
                status !== 'all' || majorOnly || since || until || me.packageTerms.length || search;
            me.historyGrid.setEmptyText(
                filtered
                    ? gettext('No transactions match the filters.')
                    : gettext('No APT history available.'),
            );
            me.store.clearFilter(true);
            me.store.filterBy(
                ({ data }) =>
                    (status === 'all' || data.status === statusRanks[status]) &&
                    (!majorOnly || H.releaseChanges(data.packages).length > 0) &&
                    data['start-time'] >= sinceTime &&
                    data['start-time'] < untilTime &&
                    (!me.packageTerms.length || me.matchingChanges(data.packages).length > 0) &&
                    (!search || matchesSearch(data, search)),
            );
            me.deselectHidden();
        };
        return {
            overflowHandler: 'scroller',
            items: [
                {
                    text: gettext('Reload'),
                    iconCls: 'fa fa-refresh',
                    handler: () => me.store.load(),
                },
                statusFilter,
                majorFilter,
                sinceFilter,
                untilFilter,
                '->',
                packageFilter,
                searchFilter,
            ],
        };
    },

    initComponent: function () {
        let me = this;
        if (!me.nodename) {
            throw 'no node name specified';
        }
        me.store = me.createStore();
        Proxmox.Utils.monStoreErrors(me, me.store, true);
        me.historyGrid = me.createHistoryGrid();
        // shown like the empty text of a grid until a transaction gets selected
        me.placeholder = Ext.create('Ext.Component', {
            flex: 1,
            cls: 'x-grid-empty',
            html: `<div style="display:flex;justify-content:center;"><p>${Proxmox.node.APTUtils.selectTransactionText}</p></div>`,
        });
        me.summary = Ext.create('Proxmox.node.APTHistorySummary', { hidden: true });
        me.tabs = Ext.create('Ext.tab.Panel', {
            flex: 1,
            border: false,
            hidden: true,
            items: [
                me.createPackageGrid(),
                { xtype: 'proxmoxNodeAPTHistoryChangelogs', nodename: me.nodename },
                {
                    xtype: 'proxmoxNodeAPTHistoryDetail',
                    title: gettext('Terminal Log'),
                    itemId: 'termlog',
                    nodename: me.nodename,
                    path: 'termlog',
                    extraParams: { format: 'styled' },
                    bodyCls: 'pmx-termlog',
                    disabled: !me.canShowTermLog,
                    renderData: (output) =>
                        output
                            ? Proxmox.node.APTUtils.renderTermLog(output)
                            : gettext('No terminal output recorded.'),
                },
            ],
        });
        // a reload keeps the selection, but the transaction can have changed, e.g. finished, and
        // then also be hidden by the filters
        me.mon(me.store, 'load', (_store, _records, success) => {
            if (success) {
                me.deselectHidden();
                me.showDetails(true);
            }
        });
        me.tbar = me.createFilters();
        me.items = [
            me.historyGrid,
            {
                xtype: 'panel',
                region: 'east',
                split: true,
                flex: 1,
                layout: { type: 'vbox', align: 'stretch' },
                items: [me.placeholder, me.summary, me.tabs],
            },
        ];
        me.on('activate', () => me.store.load());
        me.callParent();
    },
});

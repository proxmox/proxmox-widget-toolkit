Ext.define('pmx-access-log-entry', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'time', type: 'integer' },
        { name: 'utc-offset', type: 'integer' },
        'client',
        'auth-id',
        'method',
        'uri',
        'http-version',
        'request-line',
        { name: 'status', type: 'integer', allowNull: true },
        { name: 'size', type: 'integer', allowNull: true },
        'user-agent',
    ],
});

// shows the API access log of a node, newest requests first.
Ext.define('Proxmox.panel.AccessLogView', {
    extend: 'Ext.grid.Panel',
    xtype: 'proxmoxAccessLogView',

    // the access log endpoint, like '/api2/extjs/nodes/localhost/access-log'
    url: undefined,

    pageSize: 500,

    // how often live mode checks for new requests, in milliseconds
    liveInterval: 3000,

    // live mode starts over after adding that many requests, so an open view does not grow forever
    liveLimit: 5000,

    stateful: true,
    stateId: 'pmx-grid-access-log',

    sortableColumns: false,

    controller: {
        xclass: 'Ext.app.ViewController',

        // returns { params, count }, or undefined while a field is invalid.
        getFilter: function () {
            let me = this;
            let vm = me.getViewModel();
            let params = {};
            let count = 0;
            let valid = true;
            let statusFilters = {
                success: { 'max-status': 399 },
                error: { 'min-status': 400 },
                'client-error': { 'min-status': 400, 'max-status': 499 },
                'server-error': { 'min-status': 500 },
            };

            for (const field of me.getView().query('[filterParam]')) {
                if (field.isValid && !field.isValid()) {
                    valid = false;
                }
                let value = field.getValue();
                // values of exact filters can end with spaces, like the ones statistics list
                if (typeof value === 'string' && !field.exactValue) {
                    value = value.trim();
                }
                if (value === null || value === undefined || value === '' || value === false) {
                    continue;
                }
                count++;
                if (field.filterParam === 'status') {
                    let code = Number(value);
                    Object.assign(
                        params,
                        statusFilters[value] ?? { 'min-status': code, 'max-status': code },
                    );
                } else if (value === true) {
                    // Proxmox VE takes booleans as 1 or 0 only
                    params[field.filterParam] = 1;
                } else {
                    params[field.filterParam] = value;
                }
            }

            vm.set('filterCount', count);
            if (!valid) {
                return undefined;
            }

            if (!vm.get('livemode')) {
                let since = vm.get('since');
                let until = vm.get('until');
                if (since) {
                    params.since = Math.floor(since.getTime() / 1000);
                }
                if (until) {
                    // the fields have minutes, and the selected one counts until its end
                    params.until = Math.floor(until.getTime() / 1000) + 59;
                }
            }

            return { params, count };
        },

        // with keepRows, replace the existing rows only after the newest page arrives.
        reload: function (keepRows) {
            let me = this;
            let view = me.getView();
            let vm = me.getViewModel();
            let table = view.getView();

            let filter = me.getFilter();
            if (filter) {
                me.filterParams = filter.params;
                me.lastFilter = JSON.stringify(filter.params);
            }
            // requests of the previous load are ignored once they finish
            me.generation = (me.generation ?? 0) + 1;
            me.olderRunning = false;
            me.newerRunning = false;
            me.olderFailed = false;
            me.restartPending = false;
            // undefined until the newest page got loaded, null once no older requests are left
            me.nextCursor = undefined;
            me.headCursor = undefined;
            me.liveRows = 0;
            vm.set({
                failed: false,
                searchedBackTo: undefined,
                gaps: [],
                datedCopies: [],
                invalidLines: 0,
            });
            if (keepRows !== true) {
                view.getStore().removeAll();
            }
            if (table.rendered) {
                table.scrollTo(0, 0);
            }
            me.loadOlder();
        },

        loadOlder: function () {
            let me = this;
            let view = me.getView();
            let vm = me.getViewModel();
            let store = view.getStore();
            // only the table, so the toolbars stay usable after an error
            let table = view.getView();
            let cursor = me.nextCursor;
            let first = cursor === undefined;

            if (me.olderRunning || cursor === null) {
                return;
            }
            me.olderRunning = true;
            vm.set('loadingOlder', true);
            if (store.getCount() === 0) {
                let searchedBackTo = vm.get('searchedBackTo');
                Proxmox.Utils.setErrorMask(
                    table,
                    !first && searchedBackTo
                        ? Ext.String.format(
                              gettext('Searching back from {0}...'),
                              Proxmox.Utils.render_timestamp(searchedBackTo),
                          )
                        : gettext('Loading...'),
                );
            }

            let generation = me.generation;
            let params = { ...me.filterParams, limit: view.pageSize };
            if (!first) {
                params.cursor = cursor;
            }

            Proxmox.Utils.API2Request({
                url: view.url,
                method: 'GET',
                params,
                failure: function (response) {
                    if (me.isDestroyed || generation !== me.generation) {
                        return;
                    }
                    me.olderRunning = false;
                    vm.set('loadingOlder', false);
                    if (first) {
                        vm.set('failed', true);
                        Proxmox.Utils.setErrorMask(table, response.htmlStatus);
                    } else {
                        // stop loading on scroll, which would just fail again, unless the server
                        // was only busy with other requests to the log
                        me.olderFailed = !me.isBusy(response);
                        Proxmox.Utils.setErrorMask(table, false);
                        Ext.Msg.alert(gettext('Error'), response.htmlStatus);
                    }
                },
                success: function (response) {
                    if (me.isDestroyed || generation !== me.generation) {
                        return;
                    }
                    let data = response.result.data;
                    me.olderRunning = false;
                    me.nextCursor = data['next-cursor'] ?? null;
                    if (first) {
                        me.headCursor = data['head-cursor'];
                        store.loadData(data.entries);
                    } else {
                        store.add(data.entries);
                    }
                    vm.set({
                        loadingOlder: false,
                        searchedBackTo: data['searched-back-to'] ?? vm.get('searchedBackTo'),
                    });
                    me.addProblems(data);
                    Proxmox.Utils.setErrorMask(table, false);
                    me.loadMoreIfNeeded();
                },
            });
        },

        loadNewer: function () {
            let me = this;
            let view = me.getView();
            let head = me.headCursor;

            if (me.newerRunning || !head) {
                return;
            }
            me.newerRunning = true;

            let generation = me.generation;
            Proxmox.Utils.API2Request({
                url: view.url,
                method: 'GET',
                params: { ...me.filterParams, limit: view.pageSize, after: head },
                failure: function (response) {
                    if (me.isDestroyed || generation !== me.generation) {
                        return;
                    }
                    // the server is busy with other requests to the log, the next tick tries again
                    if (me.isBusy(response)) {
                        me.newerRunning = false;
                        return;
                    }
                    // the part of the log after the head can be gone after rotations, so start
                    // over, which shows the error if it persists
                    me.restart();
                },
                success: function (response) {
                    if (me.isDestroyed || generation !== me.generation) {
                        return;
                    }
                    let data = response.result.data;
                    me.newerRunning = false;
                    me.liveRows += data.entries.length;
                    if (!data.complete || me.liveRows > view.liveLimit) {
                        me.restart();
                        return;
                    }
                    if (data.entries.length > 0) {
                        let table = view.getView();
                        let atTop = table.getScrollable().getPosition().y <= 5;
                        view.getStore().insert(0, data.entries);
                        // keep the visible rows anchored unless following the newest requests
                        if (atTop) {
                            table.scrollTo(0, 0);
                        }
                    }
                    me.headCursor = data['head-cursor'];
                    me.addProblems(data);
                },
            });
        },

        // API errors arrive with HTTP status 200 and their own status in the result
        isBusy: function (response) {
            return response.result?.status === 503 || response.status === 503;
        },

        addProblems: function (data) {
            let vm = this.getViewModel();
            vm.set({
                gaps: vm.get('gaps').concat(data.gaps ?? []),
                datedCopies: [...new Set(vm.get('datedCopies').concat(data['dated-copies'] ?? []))],
                invalidLines: vm.get('invalidLines') + data['invalid-lines'],
            });
        },

        loadMoreIfNeeded: function () {
            let me = this;
            let view = me.getView();
            if (!me.nextCursor || me.olderRunning || me.olderFailed) {
                return;
            }
            if (!view.isVisible(true) || document.visibilityState !== 'visible') {
                return;
            }
            let scroller = view.getView().getScrollable();
            let left = scroller.getMaxPosition().y - scroller.getPosition().y;
            if (left < 2 * view.getView().getHeight()) {
                me.loadOlder();
            }
        },

        restart: function () {
            let me = this;
            if (document.visibilityState !== 'visible') {
                me.restartPending = true;
                return;
            }
            me.reload(true);
        },

        // Ext component visibility does not track hidden browser tabs.
        onLiveTask: function () {
            let me = this;
            let view = me.getView();
            let vm = me.getViewModel();
            if (!vm.get('livemode') || vm.get('failed') || !view.isVisible(true)) {
                return;
            }
            if (document.visibilityState !== 'visible') {
                return;
            }
            // statistics cover the view, and each request shows up in the log
            if (me.statisticsWindow?.isVisible()) {
                return;
            }
            if (view.getView().getScrollable().getPosition().y > 5) {
                return;
            }
            if (me.restartPending) {
                me.reload(true);
            } else if (me.headCursor) {
                me.loadNewer();
            } else if (me.nextCursor !== undefined && !me.olderRunning && !me.olderFailed) {
                // the log has no line yet, or ends in an unfinished overlong one
                me.reload(true);
            }
        },

        onLiveMode: function () {
            this.getViewModel().set('livemode', true);
            this.reload();
        },

        onTimespan: function () {
            let me = this;
            let vm = me.getViewModel();
            if (!vm.get('since') && !vm.get('until')) {
                let until = new Date();
                until.setSeconds(0, 0);
                vm.set({ since: Ext.Date.add(until, Ext.Date.DAY, -1), until });
            }
            vm.set('livemode', false);
            me.reload();
        },

        filterChange: function () {
            let me = this;
            let pathGroup = me.getView().down('[filterParam="path-group"]');
            pathGroup.setHidden(!pathGroup.getValue());
            let filter = me.getFilter();
            if (!filter) {
                return;
            }
            // fields also report changes that end up with the same parameters
            if (JSON.stringify(filter.params) === me.lastFilter) {
                return;
            }
            me.reload();
        },

        clearFilter: function () {
            let me = this;
            for (const field of me.getView().query('[filterParam]')) {
                field.suspendEvents();
                field.setValue(null);
                field.resumeEvents();
                field.triggers?.clear?.setVisible(false);
            }
            me.filterChange();
        },

        showFilter: function (btn, pressed) {
            this.getViewModel().set('showFilter', pressed);
        },

        showDetails: function () {
            let me = this;
            let selection = me.getView().getSelection();
            if (selection.length < 1) {
                return;
            }
            let entry = selection[0].data;
            let rows = [
                [gettext('Time'), Proxmox.Utils.render_timestamp(entry.time)],
                [gettext('User'), entry['auth-id']],
                [gettext('Client'), entry.client],
                [gettext('Method'), entry.method],
                [gettext('Path'), entry.uri],
                [gettext('HTTP Version'), entry['http-version']],
                [gettext('Request Line'), entry['request-line']],
                [gettext('Status'), entry.status ?? gettext('Unknown')],
                [gettext('Size'), Proxmox.Utils.render_size(entry.size)],
                [gettext('User Agent'), entry['user-agent']],
            ];
            me.detailsWindow?.destroy();
            me.detailsWindow = Ext.create('Ext.window.Window', {
                title: gettext('Request'),
                modal: true,
                width: 700,
                maxHeight: Math.floor(Ext.Element.getViewportHeight() * 0.8),
                constrain: true,
                autoShow: true,
                layout: 'fit',
                items: {
                    xtype: 'grid',
                    hideHeaders: true,
                    disableSelection: true,
                    scrollable: 'y',
                    store: {
                        fields: ['key', 'value'],
                        data: rows
                            .filter(([_key, value]) => value !== undefined && value !== '')
                            .map(([key, value]) => ({ key, value })),
                    },
                    columns: [
                        { dataIndex: 'key', width: 130 },
                        {
                            dataIndex: 'value',
                            flex: 1,
                            cellWrap: true,
                            renderer: function (value, metaData) {
                                // paths and user agents can be long without any space
                                metaData.tdStyle = 'word-break: break-all;';
                                return Ext.htmlEncode(value);
                            },
                        },
                    ],
                },
                buttons: [
                    {
                        text: gettext('Close'),
                        handler: function () {
                            this.up('window').close();
                        },
                    },
                ],
            });
        },

        filterBy: function (param, value) {
            this.getView().down(`[filterParam="${param}"]`).setValue(value);
            this.lookup('filterButton').setPressed(true);
        },

        showStatistics: function () {
            let me = this;
            let view = me.getView();
            let filter = me.getFilter();
            if (!filter) {
                return;
            }

            let params = { ...filter.params, top: 25 };
            if (me.getViewModel().get('livemode')) {
                // the last day up to the last full minute, which the timespan fields can hold, for
                // a row to lead to exactly the requests it counted
                let until = Math.floor(Date.now() / 60000) * 60 - 1;
                params.since = until + 1 - 24 * 3600;
                params.until = until;
            }
            let fields = Object.fromEntries(
                view.query('[filterParam]').map((field) => [field.filterParam, field.getValue()]),
            );
            me.statisticsWindow?.destroy();
            me.statisticsWindow = Ext.create('Proxmox.window.AccessLogStats', {
                url: `${view.url}/stats`,
                params,
                listeners: {
                    drilldown: function (selection) {
                        // use the counted interval, not a moving live interval
                        me.getViewModel().set({
                            livemode: false,
                            since: new Date(selection.since * 1000),
                            until: new Date((selection.until - 59) * 1000),
                        });
                        for (const [param, value] of Object.entries({
                            ...fields,
                            ...selection.fields,
                        })) {
                            view.down(`[filterParam="${param}"]`).setValue(value);
                        }
                        me.lookup('filterButton').setPressed(true);
                        me.reload();
                    },
                },
            });
            me.statisticsWindow.show();
        },

        onItemContextMenu: function (table, record, item, index, event) {
            let me = this;
            event.stopEvent();
            me.getView().setSelection(record);
            let entry = record.data;
            let items = [];
            let add = (text, param, value) => {
                if (value) {
                    let shown = Ext.htmlEncode(Ext.String.ellipsis(value, 60));
                    items.push({
                        text: Ext.String.format(text, shown),
                        iconCls: 'fa fa-filter',
                        handler: () => me.filterBy(param, value),
                    });
                }
            };
            add(gettext("Filter by Client '{0}'"), 'client', entry.client);
            add(gettext("Filter by User '{0}'"), 'auth-id', entry['auth-id']);
            // without the query, which the path filter does not look at
            add(gettext("Filter by Path '{0}'"), 'path', entry.uri?.split('?')[0]);
            items.push('-', {
                text: gettext('Details'),
                iconCls: 'fa fa-info-circle',
                handler: () => me.showDetails(),
            });
            me.contextMenu?.destroy();
            me.contextMenu = Ext.create('Ext.menu.Menu', { items });
            me.contextMenu.showAt(event.getXY());
        },

        onItemKey: function (table, record, item, index, event) {
            if (event.getKey() === event.ENTER) {
                this.showDetails();
            }
        },

        init: function (view) {
            if (!view.url) {
                throw 'no url specified';
            }
            let me = this;
            // a clear trigger follows its field's value right away, not delayed like the reload
            for (const field of view.query('[filterParam]')) {
                if (field.triggers?.clear) {
                    field.on('change', (_field, value) => field.triggers.clear.setVisible(!!value));
                }
            }
            view.getView().on('scrollend', me.loadMoreIfNeeded, me);
            view.on('show', me.loadMoreIfNeeded, me);
            view.on('resize', me.loadMoreIfNeeded, me);
            me.liveTask = Ext.TaskManager.start({
                run: me.onLiveTask,
                scope: me,
                interval: view.liveInterval,
            });
            // catch up without waiting for the polling interval
            me.onVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    me.loadMoreIfNeeded();
                    me.onLiveTask();
                }
            };
            document.addEventListener('visibilitychange', me.onVisibilityChange);
            // the mask while loading needs the table to be rendered, and the buffered rendering
            // of its rows to know its size
            view.on('boxready', me.reload, me, { single: true });
        },

        // the view's destruction hook releases resources it does not own
        cleanup: function () {
            let me = this;
            Ext.TaskManager.stop(me.liveTask);
            document.removeEventListener('visibilitychange', me.onVisibilityChange);
            me.detailsWindow?.destroy();
            me.statisticsWindow?.destroy();
            me.contextMenu?.destroy();
        },
    },

    beforeDestroy: function () {
        this.getController()?.cleanup();
        this.callParent();
    },

    viewModel: {
        data: {
            livemode: true,
            since: null,
            until: null,
            loadingOlder: false,
            failed: false,
            searchedBackTo: undefined,
            gaps: [],
            datedCopies: [],
            invalidLines: 0,
            showFilter: false,
            filterCount: 0,
        },

        formulas: {
            filterIcon: (get) => 'fa fa-filter' + (get('showFilter') ? ' info-blue' : ''),
            clearFilterText: function (get) {
                let count = get('filterCount');
                if (count > 1) {
                    return gettext('Clear Filter') + ` (${count} ${gettext('Fields')})`;
                } else if (count > 0) {
                    return gettext('Clear Filter') + ` (1 ${gettext('Field')})`;
                }
                return gettext('Clear Filter');
            },
            problems: function (get) {
                let texts = [];
                let gaps = get('gaps');
                if (gaps.length > 0) {
                    let files = [...new Set(gaps.map((gap) => gap.file))];
                    texts.push(
                        Ext.String.format(gettext('Could not read all of {0}.'), files.join(', ')),
                    );
                }
                let dated = get('datedCopies');
                if (dated.length > 0) {
                    texts.push(
                        Ext.String.format(
                            gettext(
                                'Log files named by date are not read: {0}. Older requests may be missing.',
                            ),
                            dated.join(', '),
                        ),
                    );
                }
                let invalid = get('invalidLines');
                if (invalid > 0) {
                    let message = ngettext(
                        'Skipped {0} invalid line.',
                        'Skipped {0} invalid lines.',
                        invalid,
                    );
                    texts.push(Ext.String.format(message, invalid));
                }
                if (texts.length === 0) {
                    return '';
                }
                let tip = Ext.htmlEncode(Ext.htmlEncode(texts.join(' ')));
                return `<i class="fa fa-exclamation-triangle warning" data-qtip="${tip}"></i>`;
            },
        },
    },

    store: {
        model: 'pmx-access-log-entry',
    },

    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'top',
            overflowHandler: 'scroller',
            items: [
                {
                    xtype: 'segmentedbutton',
                    items: [
                        {
                            text: gettext('Live Mode'),
                            bind: {
                                pressed: '{livemode}',
                            },
                            handler: 'onLiveMode',
                        },
                        {
                            text: gettext('Select Timespan'),
                            bind: {
                                pressed: '{!livemode}',
                            },
                            handler: 'onTimespan',
                        },
                    ],
                },
                '->',
                {
                    xtype: 'tbtext',
                    html: '<i class="fa fa-spinner fa-pulse"></i>',
                    bind: {
                        hidden: '{!loadingOlder}',
                    },
                },
                {
                    xtype: 'tbtext',
                    bind: {
                        html: '{problems}',
                        hidden: '{!problems}',
                    },
                },
                {
                    xtype: 'button',
                    text: gettext('Statistics'),
                    iconCls: 'fa fa-bar-chart',
                    handler: 'showStatistics',
                },
                {
                    xtype: 'textfield',
                    filterParam: 'search',
                    emptyText: gettext('Search client, user or path'),
                    // takes the free space before the fill does
                    flex: 10,
                    minWidth: 120,
                    maxWidth: 250,
                    maxLength: 1024,
                    listeners: {
                        change: {
                            fn: 'filterChange',
                            buffer: 500,
                        },
                    },
                },
                {
                    xtype: 'button',
                    bind: {
                        text: '{clearFilterText}',
                        disabled: '{!filterCount}',
                    },
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
                    reference: 'filterButton',
                    stateId: 'pmx-access-log-showfilter',
                    stateEvents: ['toggle'],
                    applyState: function (state) {
                        if (state.pressed !== undefined) {
                            this.setPressed(state.pressed);
                        }
                    },
                    getState: function () {
                        return { pressed: this.pressed };
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
            bind: {
                hidden: '{livemode}',
            },
            items: [
                {
                    xtype: 'box',
                    autoEl: { cn: gettext('Since') + ':' },
                },
                {
                    xtype: 'proxmoxDateTimeField',
                    width: 190,
                    bind: {
                        value: '{since}',
                        maxValue: '{until}',
                    },
                },
                {
                    xtype: 'box',
                    autoEl: { cn: gettext('Until') + ':' },
                },
                {
                    xtype: 'proxmoxDateTimeField',
                    width: 190,
                    bind: {
                        value: '{until}',
                        minValue: '{since}',
                    },
                },
                {
                    xtype: 'button',
                    text: gettext('Update'),
                    handler: 'reload',
                },
            ],
        },
        {
            xtype: 'toolbar',
            dock: 'top',
            layout: {
                type: 'hbox',
                align: 'top',
                overflowHandler: 'scroller',
            },
            bind: {
                hidden: '{!showFilter}',
            },
            defaults: {
                xtype: 'container',
                padding: 10,
                flex: 1,
                minWidth: 180,
                maxWidth: 340,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                },
                defaults: {
                    labelWidth: 60,
                    listeners: {
                        change: {
                            fn: 'filterChange',
                            buffer: 500,
                        },
                    },
                },
            },
            items: [
                {
                    // the user field shares its row with a checkbox
                    flex: 1.5,
                    minWidth: 280,
                    maxWidth: 440,
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            fieldLabel: gettext('User'),
                            layout: 'hbox',
                            defaults: {
                                listeners: {
                                    change: {
                                        fn: 'filterChange',
                                        buffer: 500,
                                    },
                                },
                            },
                            items: [
                                {
                                    xtype: 'textfield',
                                    filterParam: 'auth-id',
                                    emptyText: gettext('All'),
                                    maxLength: 1024,
                                    flex: 1,
                                },
                                {
                                    xtype: 'checkbox',
                                    filterParam: 'auth-id-exact',
                                    boxLabel: gettext('Exact match'),
                                    margin: '0 0 0 10',
                                    autoEl: {
                                        'data-qtip': gettext(
                                            'Only the user itself, not its API tokens.',
                                        ),
                                    },
                                },
                            ],
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: gettext('Client'),
                            filterParam: 'client',
                            emptyText: gettext('All'),
                            vtype: 'IP64Address',
                        },
                    ],
                },
                {
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: gettext('Method'),
                            filterParam: 'method',
                            emptyText: gettext('All'),
                            editable: true,
                            maxLength: 32,
                            store: ['GET', 'POST', 'PUT', 'DELETE'],
                            triggers: {
                                clear: {
                                    cls: 'pmx-clear-trigger',
                                    weight: -1,
                                    hidden: true,
                                    handler: function () {
                                        this.setValue(null);
                                    },
                                },
                            },
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: gettext('Status'),
                            filterParam: 'status',
                            emptyText: gettext('All'),
                            autoEl: {
                                'data-qtip': gettext(
                                    'Status filters include only requests with a known status.',
                                ),
                            },
                            editable: false,
                            store: [
                                ['success', gettext('Successful')],
                                ['error', gettext('Errors')],
                                ['client-error', gettext('Client Errors')],
                                ['server-error', gettext('Server Errors')],
                            ],
                            triggers: {
                                clear: {
                                    cls: 'pmx-clear-trigger',
                                    weight: -1,
                                    hidden: true,
                                    handler: function () {
                                        this.setValue(null);
                                    },
                                },
                            },
                        },
                    ],
                },
                {
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: gettext('Path'),
                            labelWidth: 80,
                            filterParam: 'path',
                            emptyText: gettext('Contains'),
                            maxLength: 1024,
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: gettext('Path Group'),
                            labelWidth: 80,
                            filterParam: 'path-group',
                            hidden: true,
                            exactValue: true,
                            emptyText: gettext('All'),
                            maxLength: 1024,
                        },
                    ],
                },
            ],
        },
    ],

    viewConfig: {
        trackOver: false,
        stripeRows: false, // does not work with getRowClass()
        emptyText: gettext('No requests found'),
        deferEmptyText: false,
        getRowClass: function (record) {
            let status = record.get('status');
            if (status === null || status === undefined) {
                return '';
            }
            if (status >= 500) {
                return 'proxmox-invalid-row';
            } else if (status >= 400) {
                return 'proxmox-warning-row';
            }
            return '';
        },
    },

    listeners: {
        itemdblclick: 'showDetails',
        itemkeydown: 'onItemKey',
        itemcontextmenu: 'onItemContextMenu',
    },

    columns: [
        {
            header: gettext('Time'),
            dataIndex: 'time',
            width: 150,
            renderer: Proxmox.Utils.render_timestamp,
        },
        {
            header: gettext('User'),
            dataIndex: 'auth-id',
            width: 150,
            renderer: Ext.htmlEncode,
        },
        {
            header: gettext('Client'),
            dataIndex: 'client',
            width: 130,
            renderer: Ext.htmlEncode,
        },
        {
            header: gettext('Method'),
            dataIndex: 'method',
            width: 80,
            renderer: Ext.htmlEncode,
        },
        {
            header: gettext('Path'),
            dataIndex: 'uri',
            flex: 1,
            renderer: Ext.htmlEncode,
        },
        {
            header: gettext('Status'),
            dataIndex: 'status',
            width: 70,
            renderer: (value) => value ?? gettext('Unknown'),
        },
        {
            header: gettext('Size'),
            dataIndex: 'size',
            width: 90,
            hidden: true,
            align: 'right',
            renderer: Proxmox.Utils.render_size,
        },
        {
            header: gettext('User Agent'),
            dataIndex: 'user-agent',
            width: 200,
            hidden: true,
            renderer: Ext.htmlEncode,
        },
    ],
});

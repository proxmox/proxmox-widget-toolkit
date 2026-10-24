Ext.define('Proxmox.window.AccessLogStats', {
    extend: 'Ext.window.Window',

    url: undefined,
    params: undefined,

    title: gettext('Access Log Statistics'),
    modal: true,
    constrain: true,
    layout: {
        type: 'vbox',
        align: 'stretch',
    },

    controller: {
        xclass: 'Ext.app.ViewController',

        init: function (view) {
            view.on('boxready', this.reload, this, { single: true });
        },

        reload: function () {
            let me = this;
            let view = me.getView();
            if (me.loading) {
                return;
            }
            me.loading = true;
            Proxmox.Utils.API2Request({
                url: view.url,
                method: 'GET',
                params: view.params,
                waitMsgTarget: view,
                success: function (response) {
                    if (!me.isDestroyed && !view.isDestroyed) {
                        me.loading = false;
                        me.fill(response.result.data);
                    }
                },
                failure: function (response) {
                    if (!me.isDestroyed && !view.isDestroyed) {
                        me.loading = false;
                        Ext.Msg.alert(gettext('Error'), response.htmlStatus);
                    }
                },
            });
        },

        showRequests: function (record, drillDown) {
            let me = this;
            let fields = !record.get('others') && drillDown(record.get('key'));
            if (!fields || !me.shown) {
                return;
            }
            let view = me.getView();
            view.fireEvent('drilldown', { since: me.shown.since, until: me.shown.until, fields });
            view.close();
        },

        fill: function (data) {
            let me = this;
            let view = me.getView();
            let total = data.total;
            view.setTitle(
                Ext.String.format(
                    gettext('Access Log Statistics: {0} to {1}'),
                    Proxmox.Utils.render_timestamp(data.since),
                    Proxmox.Utils.render_timestamp(data.until),
                ),
            );
            let invalid = data['invalid-lines'];
            let counts =
                invalid > 0
                    ? ngettext(
                          '{0} requests, {1} client errors, {2} server errors, {3} invalid line',
                          '{0} requests, {1} client errors, {2} server errors, {3} invalid lines',
                          invalid,
                      )
                    : gettext('{0} requests, {1} client errors, {2} server errors');
            let text = Ext.htmlEncode(
                Ext.String.format(
                    counts,
                    total.requests,
                    total['client-errors'],
                    total['server-errors'],
                    invalid,
                ),
            );
            let notices = [];
            if (data.stopped === 'damaged') {
                notices.push(
                    Ext.String.format(
                        gettext('Could not read all of {0}. Actual counts may be higher.'),
                        data.gaps[0]?.file ?? '?',
                    ),
                );
            } else if (data.stopped) {
                notices.push(
                    gettext(
                        'Statistics are incomplete because the scan limit was reached. Actual counts may be higher.',
                    ),
                );
            }
            let dated = data['dated-copies'] ?? [];
            if (dated.length > 0) {
                notices.push(
                    Ext.String.format(
                        gettext(
                            'Log files named by date are not counted: {0}. Actual counts may be higher.',
                        ),
                        dated.join(', '),
                    ),
                );
            }
            for (const notice of notices) {
                text += `<br><i class="fa fa-exclamation-triangle warning"></i> ${Ext.htmlEncode(notice)}`;
            }
            me.shown = data;
            view.down('#summary').setHtml(text);

            let histogram = data.histogram;
            let chart = view.down('#histogram');
            chart.setTitle(
                Ext.String.format(
                    gettext('Requests per {0}'),
                    Proxmox.Utils.format_duration_human(histogram.bucket),
                ),
            );
            chart.getStore().setData(
                histogram.counts.map((counts, index) => ({
                    time: (histogram.start + index * histogram.bucket) * 1000,
                    requests: counts.requests,
                    errors: counts['client-errors'] + counts['server-errors'],
                })),
            );

            for (const [, name] of view.lists) {
                let list = data[name];
                let rows = list.rows.map((row) => ({
                    key: row.key,
                    requests: row.requests,
                    clientErrors: row['client-errors'],
                    serverErrors: row['server-errors'],
                    last: row.last,
                }));
                if (list.others.requests > 0) {
                    rows.push({
                        others: list.truncated
                            ? gettext('Other values, more than counted separately')
                            : gettext('Other values'),
                        requests: list.others.requests,
                        clientErrors: list.others['client-errors'],
                        serverErrors: list.others['server-errors'],
                    });
                }
                view.down(`#${name}`).getStore().setData(rows);
            }
        },
    },

    createGrid: function ([title, name, drillDown]) {
        let me = this;
        return {
            xtype: 'grid',
            title,
            itemId: name,
            store: {
                fields: ['key', 'others', 'requests', 'clientErrors', 'serverErrors', 'last'],
            },
            columns: [
                {
                    header: title,
                    dataIndex: 'key',
                    flex: 1,
                    renderer: function (value, metaData, record) {
                        if (record.get('others')) {
                            return `<i>${Ext.htmlEncode(record.get('others'))}</i>`;
                        }
                        let text =
                            value === undefined || value === null
                                ? name === 'statuses'
                                    ? gettext('Unknown')
                                    : '-'
                                : Ext.htmlEncode(value);
                        return drillDown(value) ? `<a href="#">${text}</a>` : text;
                    },
                },
                { header: gettext('Requests'), dataIndex: 'requests', width: 100 },
                {
                    header: gettext('Client Errors'),
                    dataIndex: 'clientErrors',
                    width: 110,
                    tooltip: gettext('Error counts exclude requests with an unknown status.'),
                },
                {
                    header: gettext('Server Errors'),
                    dataIndex: 'serverErrors',
                    width: 110,
                    tooltip: gettext('Error counts exclude requests with an unknown status.'),
                },
                {
                    header: gettext('Last Seen'),
                    dataIndex: 'last',
                    width: 150,
                    renderer: (value) => (value ? Proxmox.Utils.render_timestamp(value) : ''),
                },
            ],
            listeners: {
                itemclick: function (table, record, item, index, event) {
                    if (event.getTarget('a')) {
                        event.stopEvent();
                        me.getController().showRequests(record, drillDown);
                    }
                },
                itemdblclick: (table, record) => me.getController().showRequests(record, drillDown),
                itemkeydown: function (table, record, item, index, event) {
                    if (event.getKey() === event.ENTER) {
                        event.stopEvent();
                        me.getController().showRequests(record, drillDown);
                    }
                },
            },
        };
    },

    buttons: [
        {
            text: gettext('Reload'),
            iconCls: 'fa fa-refresh',
            handler: 'reload',
        },
        {
            text: gettext('Close'),
            handler: function () {
                this.up('window').close();
            },
        },
    ],

    initComponent: function () {
        let me = this;
        if (!me.url || !me.params) {
            throw 'no url or parameters specified';
        }
        me.width = Math.min(900, Ext.Element.getViewportWidth() - 20);
        me.height = Math.min(760, Math.floor(Ext.Element.getViewportHeight() * 0.9));
        me.lists = [
            [gettext('Client'), 'clients', (key) => key && { client: key }],
            [
                gettext('User'),
                'auth-ids',
                (key) => ({ 'auth-id': key ?? '-', 'auth-id-exact': true }),
            ],
            [gettext('Path Group'), 'path-groups', (key) => key && { 'path-group': key }],
            [gettext('Status'), 'statuses', (key) => key && { status: key }],
        ];
        me.items = [
            {
                xtype: 'box',
                itemId: 'summary',
                padding: 10,
            },
            {
                xtype: 'proxmoxRRDChart',
                itemId: 'histogram',
                title: gettext('Requests'),
                height: 260,
                innerPadding: { left: 40, right: 40, top: 0, bottom: 0 },
                axes: [
                    {
                        type: 'numeric',
                        position: 'left',
                        grid: true,
                        renderer: 'leftAxisRenderer',
                        minimum: 0,
                    },
                    {
                        type: 'time',
                        position: 'bottom',
                        grid: true,
                        fields: ['time'],
                        style: { estStepSize: 150 },
                        renderer: function (axis, value, context, previous) {
                            let date = new Date(value);
                            let day = Ext.Date.format(date, 'Y-m-d');
                            let time = Ext.Date.format(date, 'H:i');
                            return previous === null ||
                                day !== Ext.Date.format(new Date(previous), 'Y-m-d')
                                ? `${day}\n${time}`
                                : time;
                        },
                    },
                ],
                fields: ['requests', 'errors'],
                fieldTitles: [gettext('Requests'), gettext('Errors')],
                checkThemeColors: function () {
                    let me = this;
                    let errorColor =
                        getComputedStyle(document.documentElement)
                            .getPropertyValue('--pwt-gauge-crit')
                            .trim() || '#ff6c59';
                    me.getSeries()[1].setColors([errorColor]);
                    Proxmox.widget.RRDChart.prototype.checkThemeColors.call(me);
                },
                store: {
                    fields: ['time', 'requests', 'errors'],
                    autoDestroy: true,
                },
            },
            {
                xtype: 'tabpanel',
                flex: 1,
                items: me.lists.map((list) => me.createGrid(list)),
            },
        ];
        me.callParent();
    },
});

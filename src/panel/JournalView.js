/*
 * Display log entries in a panel with scrollbar
 * The log entries are automatically refreshed via a background task,
 * with newest entries coming at the bottom
 */
Ext.define('Proxmox.panel.JournalView', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxJournalView',

    numEntries: 500,
    lineHeight: 16,

    // opt-in: request the structured -J reader output so lines can be colored by priority
    structured: false,

    scrollToEnd: true,

    controller: {
        xclass: 'Ext.app.ViewController',

        updateParams: function () {
            let me = this;
            let viewModel = me.getViewModel();
            // clone, as the bound viewModel dates must not be mutated in place: doing so would
            // advance 'until' by a day on every call (each filter change routes through here)
            let since = new Date(viewModel.get('since'));
            let until = new Date(viewModel.get('until'));

            since.setHours(0, 0, 0, 0);
            until.setHours(0, 0, 0, 0);
            until.setDate(until.getDate() + 1);

            me.getView().loadTask.delay(200, undefined, undefined, [
                false,
                false,
                Ext.Date.format(since, 'U'),
                Ext.Date.format(until, 'U'),
            ]);
        },

        scrollPosBottom: function () {
            let view = this.getView();
            let pos = view.getScrollY();
            let maxPos = view.getScrollable().getMaxPosition().y;
            return maxPos - pos;
        },

        scrollPosTop: function () {
            let view = this.getView();
            return view.getScrollY();
        },

        updateScroll: function (livemode, num, scrollPos, scrollPosTop) {
            let me = this;
            let view = me.getView();

            let scrollX = view.getScrollX() ?? 0;
            if (!livemode) {
                setTimeout(function () {
                    view.scrollTo(0, 0);
                }, 10);
            } else if (view.scrollToEnd && scrollPos <= 5) {
                setTimeout(function () {
                    view.scrollTo(scrollX, Infinity);
                }, 10);
            } else if (!view.scrollToEnd && scrollPosTop < 20 * view.lineHeight) {
                setTimeout(function () {
                    view.scrollTo(scrollX, num * view.lineHeight + scrollPosTop);
                }, 10);
            }
        },

        // indent a multi-line message's continuation lines under where the message starts, like
        // journalctl; the monospace pre content makes the spaces line up
        renderLine: function (entry, host) {
            let ts = Ext.Date.format(new Date(entry.t / 1000), 'M d H:i:s');
            let pid = entry.pid !== undefined ? '[' + entry.pid + ']' : '';
            let prefix = ts + ' ' + (host ? host + ' ' : '') + (entry.id ?? '') + pid + ': ';
            let msg = entry.msg ?? '';
            if (msg.includes('\n')) {
                msg = msg.replace(/\n/g, '\n' + ' '.repeat(prefix.length));
            }
            let cls = 'pmx-journal-prio-' + (entry.p ?? 6);
            return '<span class="' + cls + '">' + Ext.htmlEncode(prefix + msg) + '</span>';
        },

        renderReboot: function (entry) {
            let ts = entry.t ? Ext.Date.format(new Date(entry.t / 1000), 'M d H:i:s') + ' ' : '';
            return '<span class="pmx-journal-reboot">' + Ext.htmlEncode(ts) + '-- Reboot --</span>';
        },

        // also accept the legacy flat-string format so a newer web UI keeps working on -j output
        processData: function (lines) {
            let me = this;
            let newstart, newend, host;
            let parts = [];
            if (lines.length && typeof lines[0] === 'object') {
                for (const el of lines) {
                    if (el.ty === 'cursor') {
                        if (newend === undefined) {
                            newend = el.c;
                        }
                        newstart = el.c;
                    } else if (el.ty === 'host') {
                        host = el.h;
                    } else if (el.ty === 'identifiers') {
                        me.setIdentifiers(el.ids);
                    } else if (el.ty === 'reboot') {
                        parts.push(me.renderReboot(el));
                    } else {
                        parts.push(me.renderLine(el, host));
                    }
                }
            } else {
                newend = lines.shift();
                newstart = lines.pop();
                parts = lines.map((line) => Ext.htmlEncode(line));
            }
            return { html: parts.join('<br>'), num: parts.length, newstart, newend };
        },

        setIdentifiers: function (ids) {
            let me = this;
            let combo = me.lookup('serviceFilter');
            if (!combo) {
                return;
            }
            combo.getStore().loadData(ids.map((id) => ({ id })));
            me.getView().identifiersLoaded = true;
        },

        updateView: function (lines, livemode, top) {
            let me = this;
            let view = me.getView();
            let viewmodel = me.getViewModel();
            if (!viewmodel || viewmodel.get('livemode') !== livemode) {
                return; // we switched mode, do not update the content
            }
            let contentEl = me.lookup('content');

            // save old scrollpositions
            let scrollPos = me.scrollPosBottom();
            let scrollPosTop = me.scrollPosTop();

            let { html, num, newstart, newend } = me.processData(lines);

            let contentChanged = true;

            if (!livemode) {
                view.content = html || 'nothing logged or no timespan selected';
            } else {
                if (top && num) {
                    view.content = view.content ? html + '<br>' + view.content : html;
                } else if (!top && num) {
                    view.content = view.content ? view.content + '<br>' + html : html;
                } else {
                    contentChanged = false;
                }

                // update cursors, but only when the response actually carried one; an empty poll,
                // e.g. a priority filter that currently matches nothing, must not wipe our position
                if (newstart !== undefined && (!top || !view.startcursor)) {
                    view.startcursor = newstart;
                }

                if (newend !== undefined && (top || !view.endcursor)) {
                    view.endcursor = newend;
                }
            }

            if (contentChanged) {
                contentEl.update(view.content);
            }

            me.updateScroll(livemode, num, scrollPos, scrollPosTop);
        },

        doLoad: function (livemode, top, since, until) {
            let me = this;
            if (me.running) {
                me.requested = true;
                return;
            }
            me.running = true;
            let view = me.getView();
            let params = {
                lastentries: view.numEntries || 500,
            };
            if (livemode) {
                if (!top && view.startcursor) {
                    params = {
                        startcursor: view.startcursor,
                    };
                } else if (view.endcursor) {
                    params.endcursor = view.endcursor;
                }
            } else {
                params = {
                    since: since,
                    until: until,
                };
            }
            let priority = me.lookup('priorityFilter').getValue();
            if (priority && priority !== '__all__') {
                params.priority = priority;
            }
            let service = me.lookup('serviceFilter').getValue();
            if (service) {
                params.service = service;
            }
            if (view.structured) {
                params.structured = 1;
                if (!view.identifiersLoaded) {
                    params.identifiers = 1;
                }
            }
            Proxmox.Utils.API2Request({
                url: view.url,
                params: params,
                waitMsgTarget: !livemode ? view : undefined,
                method: 'GET',
                success: function (response) {
                    if (me.isDestroyed) {
                        return;
                    }
                    Proxmox.Utils.setErrorMask(me, false);
                    let lines = response.result.data;
                    me.updateView(lines, livemode, top);
                    me.running = false;
                    if (me.requested) {
                        me.requested = false;
                        view.loadTask.delay(200);
                    }
                },
                failure: function (response) {
                    let msg = response.htmlStatus;
                    Proxmox.Utils.setErrorMask(me, msg);
                    me.running = false;
                    if (me.requested) {
                        me.requested = false;
                        view.loadTask.delay(200);
                    }
                },
            });
        },

        onScroll: function (x, y) {
            let me = this;
            let view = me.getView();
            let viewmodel = me.getViewModel();
            let livemode = viewmodel.get('livemode');
            if (!livemode) {
                return;
            }

            if (me.scrollPosTop() < 20 * view.lineHeight) {
                view.scrollToEnd = false;
                view.loadTask.delay(200, undefined, undefined, [true, true]);
            } else if (me.scrollPosBottom() <= 5) {
                view.scrollToEnd = true;
            }
        },

        init: function (view) {
            let me = this;

            if (!view.url) {
                throw 'no url specified';
            }

            let viewmodel = me.getViewModel();
            let viewModel = this.getViewModel();
            let since = new Date();
            since.setDate(since.getDate() - 3);
            viewModel.set('until', new Date());
            viewModel.set('since', since);
            me.lookup('content').setStyle('line-height', view.lineHeight + 'px');
            viewModel.set('structured', view.structured === true);

            view.loadTask = new Ext.util.DelayedTask(me.doLoad, me, [true, false]);

            view.task = Ext.TaskManager.start({
                run: function () {
                    if (!view.isVisible() || !view.scrollToEnd || !viewmodel.get('livemode')) {
                        return;
                    }

                    if (me.scrollPosBottom() <= 5) {
                        view.loadTask.delay(200, undefined, undefined, [true, false]);
                    }
                },
                interval: 1000,
            });
        },

        onLiveMode: function () {
            let me = this;
            let view = me.getView();
            delete view.startcursor;
            delete view.endcursor;
            delete view.content;
            me.getViewModel().set('livemode', true);
            view.scrollToEnd = true;
            me.updateView([], true, false);
        },

        onTimespan: function () {
            let me = this;
            me.getViewModel().set('livemode', false);
            me.updateView([], false);
        },

        // filters run server-side, so a change drops the buffered position and reloads
        onFilterChange: function () {
            let me = this;
            let view = me.getView();
            if (!view.loadTask) {
                return; // not initialized yet, ignore the controls' initial value events
            }
            me.syncFiltersActive();
            delete view.startcursor;
            delete view.endcursor;
            delete view.content;
            // clear now; updateView won't, as it must not wipe the tail on an empty live poll
            me.lookup('content').update('');
            if (me.getViewModel().get('livemode')) {
                view.scrollToEnd = true;
                view.loadTask.delay(200, undefined, undefined, [true, false]);
            } else {
                me.updateParams();
            }
        },

        // enable the Reset button only while some filter differs from the unfiltered default
        syncFiltersActive: function () {
            let me = this;
            let priority = me.lookup('priorityFilter');
            if (!priority) {
                return;
            }
            let active =
                priority.getValue() !== '__all__' ||
                !!me.lookup('serviceFilter').getValue();
            me.getViewModel().set('filtersActive', active);
        },

        // reset every filter to the unfiltered view
        onResetFilters: function () {
            let me = this;
            me.lookup('priorityFilter').setValue('__all__');
            me.lookup('serviceFilter').setValue('');
            me.onFilterChange();
        },

        onToggleFilters: function (btn, pressed) {
            this.getViewModel().set('showFilters', pressed);
        },

        // the freeform identifier field applies on Enter or clear, not on every keystroke
        onTextFilterChange: function (field, value) {
            field.triggers.clear.setVisible(!!value);
            this.syncFiltersActive();
        },

        onTextFilterKey: function (field, e) {
            if (e.getKey() === e.ENTER) {
                this.onFilterChange();
            }
        },
    },

    onDestroy: function () {
        let me = this;
        me.loadTask.cancel();
        Ext.TaskManager.stop(me.task);
        delete me.content;
    },

    // for user to initiate a load from outside
    requestUpdate: function () {
        let me = this;
        me.loadTask.delay(200);
    },

    viewModel: {
        data: {
            livemode: true,
            until: null,
            since: null,
            structured: false,
            showFilters: false,
            filtersActive: false,
        },
    },

    layout: 'auto',
    bodyPadding: 5,
    scrollable: {
        x: 'auto',
        y: 'auto',
        listeners: {
            // we have to have this here, since we cannot listen to events
            // of the scroller in the viewcontroller (extjs bug?), nor does
            // the panel have a 'scroll' event'
            scroll: {
                fn: function (scroller, x, y) {
                    let controller = this.component.getController();
                    if (controller) {
                        // on destroy, controller can be gone
                        controller.onScroll(x, y);
                    }
                },
                buffer: 200,
            },
        },
    },

    dockedItems: [
        {
            xtype: 'toolbar',
            dock: 'top',
            items: [
                '->',
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
                {
                    xtype: 'box',
                    bind: { disabled: '{livemode}' },
                    autoEl: { cn: gettext('Since') + ':' },
                },
                {
                    xtype: 'datefield',
                    name: 'since_date',
                    reference: 'since',
                    format: 'Y-m-d',
                    bind: {
                        disabled: '{livemode}',
                        value: '{since}',
                        maxValue: '{until}',
                    },
                },
                {
                    xtype: 'box',
                    bind: { disabled: '{livemode}' },
                    autoEl: { cn: gettext('Until') + ':' },
                },
                {
                    xtype: 'datefield',
                    name: 'until_date',
                    reference: 'until',
                    format: 'Y-m-d',
                    bind: {
                        disabled: '{livemode}',
                        value: '{until}',
                        minValue: '{since}',
                    },
                },
                {
                    xtype: 'button',
                    text: gettext('Update'),
                    reference: 'updateBtn',
                    handler: 'updateParams',
                    bind: {
                        disabled: '{livemode}',
                    },
                },
                {
                    // only meaningful against a structured backend, opted into via 'structured'
                    xtype: 'button',
                    text: gettext('Filter'),
                    iconCls: 'fa fa-filter',
                    enableToggle: true,
                    bind: { hidden: '{!structured}' },
                    listeners: {
                        toggle: 'onToggleFilters',
                    },
                },
            ],
        },
        {
            xtype: 'toolbar',
            dock: 'top',
            reference: 'filterSection',
            bind: { hidden: '{!showFilters}' },
            items: [
                {
                    xtype: 'proxmoxKVComboBox',
                    fieldLabel: gettext('Minimum Priority'),
                    labelWidth: 120,
                    width: 260,
                    reference: 'priorityFilter',
                    value: '__all__',
                    comboItems: [
                        ['__all__', gettext('All')],
                        ['0', gettext('Emergency')],
                        ['1', gettext('Alert')],
                        ['2', gettext('Critical')],
                        ['3', gettext('Error')],
                        ['4', gettext('Warning')],
                        ['5', gettext('Notice')],
                        ['6', gettext('Informational')],
                    ],
                    listeners: {
                        change: 'onFilterChange',
                    },
                },
                {
                    xtype: 'combo',
                    fieldLabel: gettext('Identifier'),
                    labelWidth: 65,
                    width: 280,
                    reference: 'serviceFilter',
                    // a server-side glob on the syslog identifier; freeform, the store only suggests
                    editable: true,
                    forceSelection: false,
                    anyMatch: true,
                    queryMode: 'local',
                    displayField: 'id',
                    valueField: 'id',
                    store: { fields: ['id'], sorters: ['id'] },
                    emptyText: gettext('e.g. pve* or postfix/*'),
                    triggers: {
                        clear: {
                            cls: 'pmx-clear-trigger',
                            weight: -1,
                            hidden: true,
                            handler: function () {
                                this.setValue('');
                                this.lookupController().onFilterChange();
                            },
                        },
                    },
                    listeners: {
                        change: 'onTextFilterChange',
                        select: 'onFilterChange',
                        specialkey: 'onTextFilterKey',
                    },
                },
                '->',
                {
                    xtype: 'button',
                    text: gettext('Reset'),
                    handler: 'onResetFilters',
                    bind: { disabled: '{!filtersActive}' },
                },
            ],
        },
    ],

    items: [
        {
            xtype: 'box',
            reference: 'content',
            style: {
                font: 'normal 12px monospace',
                'white-space': 'pre',
            },
        },
    ],
});

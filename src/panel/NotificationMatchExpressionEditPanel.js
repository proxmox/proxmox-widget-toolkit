Ext.define('Proxmox.panel.NotificationMatchExpressionEditPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pmxNotificationMatchExpressionEditPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    controller: {
        xclass: 'Ext.app.ViewController',

        // we want to also set the empty value, but 'bind' does not do that so
        // we have to set it then (and only then) to get the correct value in
        // the tree
        control: {
            field: {
                change: function (cmp) {
                    let me = this;
                    let vm = me.getViewModel();
                    if (cmp.field) {
                        let record = vm.get('selectedRecord');
                        if (!record) {
                            return;
                        }
                        let data = Ext.apply({}, record.get('data'));
                        let value = cmp.getValue();
                        // only update if the value is empty (or empty array)
                        if (!value || !value.length) {
                            data[cmp.field] = value;
                            record.set({ data });
                        }
                    }
                },
            },
        },
    },

    viewModel: {
        data: {
            invertMatch: false,
            selectedRecord: null,
            matchFieldType: 'exact',
            matchFieldField: '',
            matchFieldValue: '',
        },

        formulas: {
            showMatcherType: (get) => get('selectedRecord') !== null,

            invertMatch: {
                bind: {
                    bindTo: '{selectedRecord}',
                    deep: true,
                },
                get: function (record) {
                    return record?.get('invert');
                },
                set: function (value) {
                    let me = this;
                    let record = me.get('selectedRecord');
                    record.set('invert', value);
                },
            },
            nodeType: {
                get: function (get) {
                    let record = get('selectedRecord');
                    return record?.get('type');
                },
                set: function (value) {
                    let me = this;
                    let record = me.get('selectedRecord');

                    let data;
                    let leaf;

                    switch (value) {
                        case 'match-severity':
                            data = {
                                value: ['info', 'notice', 'warning', 'error', 'unknown'],
                            };
                            leaf = true;
                            break;
                        case 'match-field':
                            data = {
                                type: 'exact',
                                field: '',
                                value: '',
                            };
                            leaf = true;
                            break;
                        case 'match-calendar':
                            data = {
                                value: '00:00-23:59',
                            };
                            leaf = true;
                            break;
                        case 'any-of':
                        case 'all-of':
                        case 'one-of':
                            data = {};
                            leaf = false;
                            break;
                        case 'match-always':
                            data = {};
                            leaf = true;
                            break;
                    }

                    let node = {
                        type: value,
                        invert: false,
                        data,
                        leaf,
                    };

                    if (!leaf) {
                        node.expanded = true;
                        node.expandable = false;
                    } else {
                        record.removeAll();
                    }

                    record.set(node);
                },
            },
        },
    },

    column1: [
        {
            xtype: 'pmxNotificationMatchRuleTreeExpression',
            cbind: {
                baseUrl: '{baseUrl}',
            },
        },
    ],

    column2: [
        {
            xtype: 'pmxNotificationMatchExpressionNodePanel',
            cbind: {
                baseUrl: '{baseUrl}',
            },
        },
    ],

    onGetValues: function (values) {
        let me = this;

        if (!me.isCreate) {
            Proxmox.Utils.assemble_field_data(values, { delete: 'match-field' });
            Proxmox.Utils.assemble_field_data(values, { delete: 'match-severity' });
            Proxmox.Utils.assemble_field_data(values, { delete: 'match-calendar' });
            Proxmox.Utils.assemble_field_data(values, { delete: 'mode' });
            Proxmox.Utils.assemble_field_data(values, { delete: 'invert-match' });
        }

        return values;
    },
});

Ext.define('Proxmox.panel.NotificationMatchRuleTreeExpression', {
    extend: 'Ext.panel.Panel',
    xtype: 'pmxNotificationMatchRuleTreeExpression',
    mixins: ['Proxmox.Mixin.CBind'],
    border: false,

    // Converts a 'HH:MM' time into minutes since midnight, or NaN if it cannot
    // be parsed.
    parseTime: function (time) {
        let [hours, minutes] = time.split(':');
        return Number(hours) * 60 + Number(minutes ?? '0');
    },

    // Returns a message describing why a node is incomplete, or undefined if
    // the node is fully configured. Incomplete nodes are marked in the tree and
    // block submitting the form.
    getNodeError: function (type, data, hasChildren) {
        let me = this;

        switch (type) {
            case 'match-severity': {
                let v = Ext.isArray(data.value) ? data.value.join(', ') : data.value;
                if (!v) {
                    return gettext('Severity rules must match at least one severity.');
                }
                break;
            }
            case 'match-field': {
                let field = data.field;
                let value = data.value;
                if (!field || !value || (Ext.isArray(value) && !value.length)) {
                    return gettext('Field rules must have a field and a value.');
                }
                break;
            }
            case 'match-calendar': {
                let v = data.value;
                if (!v || !v.length) {
                    return gettext('Calendar rules must match at least one day.');
                }

                // Only schedules which the editor itself can produce are
                // checked, any other one is left to the backend. Unparsable
                // times compare as NaN and are thus not reported either.
                let [, start, end] = /^(?:\S*\s+)?([0-9:]+)-([0-9:]+)$/.exec(v) ?? [];

                if (start !== undefined && (me.parseTime(start) > me.parseTime(end))) {
                    return gettext("A calendar rule's start time cannot be after the end time.");
                }
                break;
            }
            case 'any-of':
            case 'all-of':
            case 'one-of':
                if (!hasChildren) {
                    return gettext('Rule groups must contain at least one sub-rule.');
                }
                break;
        }

        return undefined;
    },

    getNodeIcon: function (type, data, invert, hasChildren) {
        let me = this;
        let iconCls = 'fa';

        switch (type) {
            case 'match-severity':
                iconCls += ' fa-exclamation';
                break;
            case 'match-field':
                iconCls += ' fa-square-o';
                break;
            case 'match-calendar':
                iconCls += ' fa-calendar-o';
                break;
            case 'any-of':
            case 'all-of':
            case 'one-of':
                iconCls += ' fa-filter';
                break;
            case 'match-always':
                if (invert) {
                    iconCls += ' fa-ban';
                } else {
                    iconCls += ' fa-check-circle';
                }
                break;
        }

        if (me.getNodeError(type, data, hasChildren)) {
            iconCls += ' internal-error';
        }

        return iconCls;
    },

    renderTreeLabel: function (_value, meta, record) {
        let data = record.get('data');
        let invert = record.get('invert');
        let type = record.get('type');

        switch (type) {
            case 'match-severity': {
                let v;

                if (data.value) {
                    v = data.value.map((x) => `<code>${Ext.String.htmlEncode(x)}</code>`).join(' ');
                } else {
                    v = '<code>?</code>';
                }

                if (invert) {
                    return Ext.String.format(gettext('Severity: all except {0}'), v);
                } else {
                    return Ext.String.format(gettext('Severity: {0}'), v);
                }
            }
            case 'match-field': {
                let valueIsArray = Ext.isArray(data.value);

                let field = data.field || '?';
                let value =
                    (!valueIsArray && data.value) || (valueIsArray && data.value.length)
                        ? data.value
                        : '?';
                let matchType = data.type;

                let fieldHtml = `<code>${Ext.String.htmlEncode(field)}</code>`;
                let valueHtml = `<code>${Ext.String.htmlEncode(value)}</code>`;

                if (matchType === 'exact') {
                    if (Ext.isArray(value) && value.length > 1) {
                        valueHtml = value
                            .map((x) => `<code>${Ext.String.htmlEncode(x)}</code>`)
                            .join(' ');

                        if (invert) {
                            // inverted field matcher, matching multiple values
                            return Ext.String.format(
                                gettext('Field: {0} none of {1}'),
                                fieldHtml,
                                valueHtml,
                            );
                        } else {
                            // non-inverted field matcher, matching multiple values
                            return Ext.String.format(
                                gettext('Field: {0} any of {1}'),
                                fieldHtml,
                                valueHtml,
                            );
                        }
                    } else if (invert) {
                        // inverted field matcher, matching a single value
                        return Ext.String.format(
                            gettext('Field: {0} is not {1}'),
                            fieldHtml,
                            valueHtml,
                        );
                    } else {
                        // non-inverted field matcher, matching a single value
                        return Ext.String.format(
                            gettext('Field: {0} is {1}'),
                            fieldHtml,
                            valueHtml,
                        );
                    }
                } else if (invert) {
                    // inverted regex-based field matcher
                    return Ext.String.format(
                        gettext('Field: {0} does not match {1}'),
                        fieldHtml,
                        valueHtml,
                    );
                } else {
                    // non-inverted regex-based field matcher
                    return Ext.String.format(
                        gettext('Field: {0} matches {1}'),
                        fieldHtml,
                        valueHtml,
                    );
                }
            }
            case 'match-calendar': {
                // A schedule which is not fully specified, for instance because
                // no weekday is selected, renders as blank, so show it as unset
                // instead.
                let value = Ext.isString(data.value) && data.value.trim() ? data.value : '?';
                value = `<code>${Ext.String.htmlEncode(value)}</code>`;

                if (invert) {
                    return Ext.String.format(gettext('Calendar: outside {0}'), value);
                } else {
                    return Ext.String.format(gettext('Calendar: within {0}'), value);
                }
            }
            case 'any-of':
                if (invert) {
                    return gettext('No sub-rule matches');
                } else {
                    return gettext('At least one sub-rule matches');
                }

            case 'all-of':
                if (invert) {
                    return gettext('At least one sub-rule does not match');
                } else {
                    return gettext('All sub-rules match');
                }

            case 'one-of':
                if (invert) {
                    return gettext('Not: Exactly one sub-rule matches');
                } else {
                    return gettext('Exactly one sub-rule matches');
                }

            case 'match-always':
                if (invert) {
                    return gettext('Never match');
                } else {
                    return gettext('Always match');
                }
        }
    },

    initComponent: function () {
        let me = this;

        let treeStore = Ext.create('Ext.data.TreeStore', {
            root: {
                expanded: true,
                expandable: false,
                text: '',
                type: 'match-always',
                data: {},
                invert: false,
                leaf: true,
                children: [],
                iconCls: 'fa fa-filter',
            },
        });

        // The field holding the expression is hidden, so render its validation
        // errors below the tree instead.
        let errorLabel = Ext.create({
            xtype: 'component',
            hidden: true,
            cls: 'x-form-invalid-under-default',
        });

        let getExpressionErrors = function () {
            let errors = [];

            treeStore.getRoot().cascade(function (node) {
                let error = me.getNodeError(
                    node.get('type'),
                    node.get('data'),
                    node.hasChildNodes(),
                );

                if (error && !errors.includes(error)) {
                    errors.push(error);
                }
            });

            return errors;
        };

        let realExpression = Ext.create({
            xtype: 'hiddenfield',
            name: 'expression',
            getErrors: function () {
                let errors = getExpressionErrors();

                errorLabel.setHtml(
                    errors.map((error) => Ext.String.htmlEncode(error)).join('<br>'),
                );
                errorLabel.setHidden(!errors.length);

                return errors;
            },
            setValue: function (value) {
                this.value = value;
                this.checkChange();
            },
            getValue: function () {
                return this.value;
            },
            getSubmitValue: function () {
                return this.value;
            },
        });

        let storeChanged = function (store) {
            store.suspendEvent('datachanged');

            store.each(function (model) {
                let type = model.get('type');
                let data = model.get('data');
                let invert = model.get('invert');

                let iconCls = me.getNodeIcon(type, data, invert, model.hasChildNodes());

                model.set({
                    iconCls,
                });
            });

            let root = store.getRoot();
            let stack = [[]];

            root.cascade({
                before: function (node) {
                    let type = node.get('type');
                    let data = node.get('data');
                    let invert = node.get('invert');

                    switch (type) {
                        case 'all-of':
                        case 'any-of':
                        case 'one-of':
                            stack.push([]);
                            break;
                        case 'match-calendar':
                            {
                                let obj = {
                                    match: {
                                        type: 'calendar',
                                        schedule: data.value,
                                    },
                                };

                                if (invert) {
                                    obj = {
                                        not: obj,
                                    };
                                }

                                stack.at(-1).push(obj);
                            }

                            break;
                        case 'match-field':
                            {
                                let obj = {
                                    match: {
                                        type: 'field',
                                        field: data.field,
                                    },
                                };

                                if (data.type === 'exact') {
                                    obj.match.values = data.value;
                                } else {
                                    obj.match.regex = data.value;
                                }

                                if (invert) {
                                    obj = {
                                        not: obj,
                                    };
                                }

                                stack.at(-1).push(obj);
                            }
                            break;
                        case 'match-severity':
                            {
                                let obj = {
                                    match: {
                                        type: 'severity',
                                        severities: data.value,
                                    },
                                };

                                if (invert) {
                                    obj = {
                                        not: obj,
                                    };
                                }

                                stack.at(-1).push(obj);
                            }
                            break;
                        case 'match-always':
                            stack.at(-1).push({
                                constant: !invert,
                            });
                            break;
                    }

                    // Visit this node
                    return true;
                },
                after: function (node) {
                    let type = node.get('type');
                    let invert = node.get('invert');

                    switch (type) {
                        case 'all-of':
                        case 'any-of':
                        case 'one-of':
                            {
                                let children = stack.pop();

                                let a = {};
                                a[type] = children;

                                if (invert) {
                                    a = {
                                        not: a,
                                    };
                                }

                                stack.at(-1).push(a);
                            }
                            break;
                    }
                },
            });

            let topLevelNodes = stack.pop();
            let obj = topLevelNodes[0];

            realExpression.suspendEvent('change');
            realExpression.setValue(JSON.stringify(obj));
            realExpression.resumeEvent('change');

            // the expression can stay the same while the tree became (in)valid,
            // e.g. when the last child of a group is removed
            realExpression.validate();

            store.resumeEvent('datachanged');
        };

        realExpression.addListener('change', function (field, value) {
            let obj;

            try {
                obj = JSON.parse(value);
            } catch (e) {
                Ext.Msg.alert(gettext('Invalid matcher expression'), e);
                return;
            }

            function visit(obj) {
                for (const [key, value] of Object.entries(obj)) {
                    let ret;

                    switch (key) {
                        case 'match':
                            {
                                switch (value.type) {
                                    case 'calendar':
                                        {
                                            ret = {
                                                type: 'match-calendar',
                                                data: {
                                                    value: value.schedule,
                                                },
                                                leaf: true,
                                                invert: false,
                                            };
                                        }
                                        break;
                                    case 'field':
                                        {
                                            ret = {
                                                type: 'match-field',
                                                data: {
                                                    field: value.field,
                                                },
                                                leaf: true,
                                                invert: false,
                                            };

                                            if (value.regex) {
                                                ret.data.type = 'regex';
                                                ret.data.value = value.regex;
                                            } else {
                                                ret.data.type = 'exact';
                                                ret.data.value = value.values;
                                            }
                                        }
                                        break;
                                    case 'severity':
                                        {
                                            ret = {
                                                type: 'match-severity',
                                                data: {
                                                    value: value.severities,
                                                },
                                                leaf: true,
                                                invert: false,
                                            };
                                        }
                                        break;
                                }
                            }
                            break;
                        case 'all-of':
                        case 'any-of':
                        case 'one-of':
                            {
                                let children = [];
                                for (let child of value) {
                                    children.push(visit(child));
                                }
                                ret = {
                                    type: key,
                                    data: {},
                                    children,
                                    leaf: false,
                                    invert: false,
                                };
                            }
                            break;
                        case 'not':
                            {
                                let child = visit(value);
                                ret = {
                                    ...child,
                                    invert: !child.invert,
                                };
                            }
                            break;
                        case 'constant': {
                            ret = {
                                type: 'match-always',
                                data: {},
                                invert: !value,
                                leaf: true,
                            };
                        }
                    }

                    let iconCls = me.getNodeIcon(
                        ret.type,
                        ret.data,
                        ret.invert,
                        !!ret.children?.length,
                    );

                    ret.iconCls = iconCls;
                    if (!ret.leaf) {
                        ret.expanded = true;
                        ret.expandable = false;
                    }

                    return ret;
                }
            }

            let rootNode = visit(obj);

            treeStore.setRootNode(rootNode);
        });

        treeStore.addListener('datachanged', storeChanged);

        let treePanel = Ext.create({
            xtype: 'treepanel',
            store: treeStore,
            // scope for the label wrapping rules in ext6-pmx.css
            cls: 'pmx-match-rule-tree',
            minHeight: 400,
            maxHeight: 400,
            scrollable: true,
            // wrapped labels have no predictable height, so render all rows
            // instead of estimating the scroll range from a sample row
            bufferedRenderer: false,

            // Allow drag&drop for tree nodes
            viewConfig: {
                plugins: {
                    ptype: 'treeviewdragdrop',
                    containerScroll: true,
                },
            },

            bind: {
                selection: '{selectedRecord}',
            },

            columns: [
                {
                    xtype: 'treecolumn',
                    dataIndex: 'text',
                    renderer: me.renderTreeLabel,
                    flex: 1,
                    // rules can list many values, wrap them so that all of
                    // them stay visible; this implies variableRowHeight
                    cellWrap: true,
                },
                {
                    xtype: 'actioncolumn',
                    width: 60,
                    items: [
                        {
                            handler: (view, rI, cI, item, e, record) => {
                                let node = record.appendChild({
                                    type: 'match-field',
                                    data: {
                                        type: 'exact',
                                        field: '',
                                        value: '',
                                    },
                                    leaf: true,
                                });

                                view.setSelection(node);
                            },
                            getTip: (v, m, rec) =>
                                Ext.String.format(gettext('Add new sub-rule'), v),
                            getClass: (v, m, { data }) => (data.leaf ? '' : 'fa fa-plus-circle'),
                            isActionDisabled: (v, r, c, i, rec) => rec.data.leaf,
                        },
                        {
                            handler: function (view, rI, cI, item, e, record) {
                                if (record.hasChildNodes()) {
                                    Ext.Msg.confirm(
                                        gettext('Remove rule?'),
                                        gettext('Remove rule and all of its sub-rules?'),
                                        (decision) => {
                                            if (decision === 'yes') {
                                                record.remove(true);
                                            }
                                        },
                                    );
                                } else {
                                    record.remove(true);
                                }
                            },
                            getTip: (v, m, rec) =>
                                Ext.String.format(gettext('Remove this rule'), v),
                            getClass: (v, m, { data }) => 'fa fa-trash-o',
                            isActionDisabled: (v, r, c, i, rec) => rec.isRoot(),
                        },
                    ],
                },
            ],
        });

        Ext.apply(me, {
            items: [
                realExpression,
                treePanel,
                {
                    // nothing in the tree hints at the nodes being movable
                    xtype: 'container',
                    margin: '5 0 0 0',
                    html: gettext(
                        'Rules can be reordered and moved between groups with drag and drop.',
                    ),
                },
                errorLabel,
            ],
        });
        me.callParent();
    },
});

Ext.define('Proxmox.panel.NotificationMatchExpressionNodePanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'pmxNotificationMatchExpressionNodePanel',
    mixins: ['Proxmox.Mixin.CBind'],
    border: false,
    layout: 'anchor',

    items: [
        {
            xtype: 'proxmoxKVComboBox',
            fieldLabel: gettext('Rule Type'),
            isFormField: false,
            allowBlank: false,
            // Hide initially to avoid glitches when opening the window
            hidden: true,
            bind: {
                value: '{nodeType}',
                hidden: '{!showMatcherType}',
            },

            comboItems: [
                ['match-always', gettext('Always match')],
                ['all-of', gettext('All sub-rules match')],
                ['any-of', gettext('At least one sub-rule matches')],
                ['one-of', gettext('Exactly one sub-rule matches')],
                ['match-field', gettext('Match Field')],
                ['match-severity', gettext('Match Severity')],
                ['match-calendar', gettext('Match Calendar')],
            ],
        },
        {
            xtype: 'proxmoxcheckbox',
            isFormField: false,
            fieldLabel: gettext('Invert Rule'),
            allowBlank: false,
            bind: {
                value: '{invertMatch}',
                hidden: '{!showMatcherType}',
            },
        },
        {
            xtype: 'component',
            height: 1,
            margin: '20 0 20 0',
            cls: 'pmx-horizontal-separator',
            bind: {
                hidden: '{!showMatcherType}',
            },
        },
        {
            xtype: 'pmxNotificationMatchFieldSettings',
            cbind: {
                baseUrl: '{baseUrl}',
            },
        },
        {
            xtype: 'pmxNotificationMatchSeveritySettings',
        },
        {
            xtype: 'pmxNotificationMatchCalendarSettings',
        },
    ],
});

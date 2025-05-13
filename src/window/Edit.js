Ext.define('Proxmox.window.Edit', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxWindowEdit',

    // autoLoad trigger a load() after component creation
    autoLoad: false,
    // set extra options like params for the load request
    autoLoadOptions: undefined,

    // to submit extra params on load and submit, useful, e.g., if not all ID
    // parameters are included in the URL
    extraRequestParams: {},

    resizable: false,

    // use this to automatically generate a title like `Create: <subject>`
    subject: undefined,

    // set isCreate to true if you want a Create button (instead OK and RESET)
    isCreate: false,

    // set to true if you want an Add button (instead of Create)
    isAdd: false,

    // set to true if you want a Remove button (instead of Create)
    isRemove: false,

    // set to false, if you don't want the reset button present
    showReset: true,

    // custom submitText
    submitText: undefined,

    // custom options for the submit api call
    submitOptions: {},

    backgroundDelay: 0,

    // string or function, called as (url, values) - useful if the ID of the
    // new object is part of the URL, or that URL differs from GET/PUT URL
    submitUrl: Ext.identityFn,

    // string or function, called as (url, initialConfig) - mostly for
    // consistency with submitUrl existing. If both are set `url` gets optional
    loadUrl: Ext.identityFn,

    // needed for finding the reference to submitbutton
    // because we do not have a controller
    referenceHolder: true,
    defaultButton: 'submitbutton',

    // finds the first form field
    defaultFocus: 'field:focusable[disabled=false][hidden=false]',

    showProgress: false,

    showTaskViewer: false,

    // gets called if we have a progress bar or taskview and it detected that
    // the task finished. function(success)
    taskDone: Ext.emptyFn,

    // gets called when the api call is finished, right at the beginning
    // function(success, response, options)
    apiCallDone: Ext.emptyFn,

    // assign a reference from docs, to add a help button docked to the
    // bottom of the window. If undefined we magically fall back to the
    // onlineHelp of our first item, if set.
    onlineHelp: undefined,

    constructor: function (conf) {
        let me = this;
        // make copies in order to prevent subclasses from accidentally writing
        // to objects that are shared with other edit window subclasses
        me.extraRequestParams = Object.assign({}, me.extraRequestParams);
        me.submitOptions = Object.assign({}, me.submitOptions);
        me.callParent(arguments);
    },

    isValid: function () {
        let me = this;

        let form = me.formPanel.getForm();
        return form.isValid();
    },

    getValues: function (dirtyOnly) {
        let me = this;

        let values = {};
        Ext.apply(values, me.extraRequestParams);

        let form = me.formPanel.getForm();

        form.getFields().each(function (field) {
            if (!field.up('inputpanel') && (!dirtyOnly || field.isDirty())) {
                Proxmox.Utils.assemble_field_data(values, field.getSubmitData());
            }
        });

        Ext.Array.each(me.query('inputpanel'), function (panel) {
            Proxmox.Utils.assemble_field_data(values, panel.getValues(dirtyOnly));
        });

        return values;
    },

    setValues: function (values) {
        let me = this;

        let form = me.formPanel.getForm();
        let formfields = form.getFields();

        Ext.iterate(values, function (id, val) {
            let fields = formfields.filterBy(
                (f) => (f.id === id || f.name === id || f.dataIndex === id) && !f.up('inputpanel'),
            );
            fields.each((field) => {
                field.setValue(val);
                if (form.trackResetOnLoad) {
                    field.resetOriginalValue();
                }
            });
        });

        Ext.Array.each(me.query('inputpanel'), function (panel) {
            panel.setValues(values);
        });
    },

    setSubmitText: function (text) {
        this.lookup('submitbutton').setText(text);
    },

    submit: function () {
        let me = this;

        let form = me.formPanel.getForm();

        let values = me.getValues();
        Ext.Object.each(values, function (name, val) {
            if (Object.hasOwn(values, name)) {
                if (Ext.isArray(val) && !val.length) {
                    values[name] = '';
                }
            }
        });

        if (me.digest) {
            values.digest = me.digest;
        }

        if (me.backgroundDelay) {
            values.background_delay = me.backgroundDelay;
        }

        let url = Ext.isFunction(me.submitUrl)
            ? me.submitUrl(me.url, values)
            : me.submitUrl || me.url;
        if (me.method === 'DELETE') {
            url = url + '?' + Ext.Object.toQueryString(values);
            values = undefined;
        }

        let requestOptions = Ext.apply(
            {
                url: url,
                waitMsgTarget: me,
                method: me.method || (me.backgroundDelay ? 'POST' : 'PUT'),
                params: values,
                failure: function (response, options) {
                    me.apiCallDone(false, response, options);

                    if (response.result && response.result.errors) {
                        form.markInvalid(response.result.errors);
                    }
                    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
                },
                success: function (response, options) {
                    let hasProgressBar =
                        (me.backgroundDelay || me.showProgress || me.showTaskViewer) &&
                        response.result.data;

                    me.apiCallDone(true, response, options);

                    if (hasProgressBar) {
                        // only hide to allow delaying our close event until task is done
                        me.hide();

                        let upid = response.result.data;
                        let viewerClass = me.showTaskViewer ? 'Viewer' : 'Progress';
                        Ext.create('Proxmox.window.Task' + viewerClass, {
                            autoShow: true,
                            upid: upid,
                            taskDone: me.taskDone,
                            listeners: {
                                destroy: function () {
                                    me.close();
                                },
                            },
                        });
                    } else {
                        me.close();
                    }
                },
            },
            me.submitOptions ?? {},
        );
        Proxmox.Utils.API2Request(requestOptions);
    },

    load: function (options) {
        let me = this;

        let form = me.formPanel.getForm();

        options = options || {};

        let newopts = Ext.apply(
            {
                waitMsgTarget: me,
            },
            options,
        );

        if (Object.keys(me.extraRequestParams).length > 0) {
            let params = newopts.params || {};
            Ext.applyIf(params, me.extraRequestParams);
            newopts.params = params;
        }

        let url = Ext.isFunction(me.loadUrl)
            ? me.loadUrl(me.url, me.initialConfig)
            : me.loadUrl || me.url;

        let createWrapper = function (successFn) {
            Ext.apply(newopts, {
                url: url,
                method: 'GET',
                success: function (response, opts) {
                    form.clearInvalid();
                    me.digest = response.result?.digest || response.result?.data?.digest;
                    if (successFn) {
                        successFn(response, opts);
                    } else {
                        me.setValues(response.result.data);
                    }
                    // hack: fix ExtJS bug
                    Ext.Array.each(me.query('radiofield'), (f) => f.resetOriginalValue());
                },
                failure: function (response, opts) {
                    Ext.Msg.alert(gettext('Error'), response.htmlStatus, function () {
                        me.close();
                    });
                },
            });
        };

        createWrapper(options.success);

        Proxmox.Utils.API2Request(newopts);
    },

    initComponent: function () {
        let me = this;

        if (
            !me.url &&
            (!me.submitUrl ||
                !me.loadUrl ||
                me.submitUrl === Ext.identityFn ||
                me.loadUrl === Ext.identityFn)
        ) {
            throw "neither 'url' nor both, submitUrl and loadUrl specified";
        }
        if (me.create) {
            throw 'deprecated parameter, use isCreate';
        }

        let items = Ext.isArray(me.items) ? me.items : [me.items];

        me.items = undefined;

        me.formPanel = Ext.create('Ext.form.Panel', {
            url: me.url, // FIXME: not in 'form' class, safe to remove??
            method: me.method || 'PUT',
            trackResetOnLoad: true,
            bodyPadding: me.bodyPadding !== undefined ? me.bodyPadding : 10,
            border: false,
            defaults: Ext.apply({}, me.defaults, {
                border: false,
            }),
            fieldDefaults: Ext.apply({}, me.fieldDefaults, {
                labelWidth: 100,
                anchor: '100%',
            }),
            items: items,
        });

        let inputPanel = me.formPanel.down('inputpanel');

        let form = me.formPanel.getForm();

        let submitText;
        if (me.isCreate) {
            if (me.submitText) {
                submitText = me.submitText;
            } else if (me.isAdd) {
                submitText = gettext('Add');
            } else if (me.isRemove) {
                submitText = gettext('Remove');
            } else {
                submitText = gettext('Create');
            }
        } else {
            submitText = me.submitText || gettext('OK');
        }

        let submitBtn = Ext.create('Ext.Button', {
            reference: 'submitbutton',
            text: submitText,
            disabled: !me.isCreate,
            handler: function () {
                me.submit();
            },
        });

        let resetTool = Ext.create('Ext.panel.Tool', {
            glyph: 'xf0e2@FontAwesome', // fa-undo
            tooltip: gettext('Reset form data'),
            callback: () => form.reset(),
            style: {
                paddingRight: '2px', // just slightly more room to breathe
            },
            disabled: true,
        });

        let set_button_status = function () {
            let valid = form.isValid();
            let dirty = form.isDirty();
            submitBtn.setDisabled(!valid || !(dirty || me.isCreate));
            resetTool.setDisabled(!dirty);
        };

        form.on('dirtychange', set_button_status);
        form.on('validitychange', set_button_status);

        let colwidth = 300;
        if (me.fieldDefaults && me.fieldDefaults.labelWidth) {
            colwidth += me.fieldDefaults.labelWidth - 100;
        }

        let twoColumn = inputPanel && (inputPanel.column1 || inputPanel.column2);

        if (me.subject && !me.title) {
            me.title = Proxmox.Utils.dialog_title(me.subject, me.isCreate, me.isAdd);
        }

        me.buttons = [submitBtn];

        if (!me.isCreate && me.showReset) {
            me.tools = [resetTool];
        }

        if (inputPanel && inputPanel.hasAdvanced) {
            let sp = Ext.state.Manager.getProvider();
            let advchecked = sp.get('proxmox-advanced-cb');
            inputPanel.setAdvancedVisible(advchecked);
            me.buttons.unshift({
                xtype: 'proxmoxcheckbox',
                itemId: 'advancedcb',
                boxLabelAlign: 'before',
                boxLabel: gettext('Advanced'),
                stateId: 'proxmox-advanced-cb',
                value: advchecked,
                listeners: {
                    change: function (cb, val) {
                        inputPanel.setAdvancedVisible(val);
                        sp.set('proxmox-advanced-cb', val);
                    },
                },
            });
        }

        let onlineHelp = me.onlineHelp;
        if (!onlineHelp && inputPanel && inputPanel.onlineHelp) {
            onlineHelp = inputPanel.onlineHelp;
        }

        if (onlineHelp) {
            let helpButton = Ext.create('Proxmox.button.Help');
            me.buttons.unshift(helpButton, '->');
            Ext.GlobalEvents.fireEvent('proxmoxShowHelp', onlineHelp);
        }

        Ext.applyIf(me, {
            modal: true,
            width: twoColumn ? colwidth * 2 : colwidth,
            border: false,
            items: [me.formPanel],
        });

        me.callParent();

        if (inputPanel?.hasAdvanced) {
            let advancedItems = inputPanel.down('#advancedContainer').query('field');
            advancedItems.forEach(function (field) {
                me.mon(field, 'validitychange', (f, valid) => {
                    if (!valid) {
                        f.up('inputpanel').setAdvancedVisible(true);
                    }
                });
            });
        }

        // always mark invalid fields
        me.on('afterlayout', function () {
            // on touch devices, the isValid function
            // triggers a layout, which triggers an isValid
            // and so on
            // to prevent this we disable the layouting here
            // and enable it afterwards
            me.suspendLayout = true;
            me.isValid();
            me.suspendLayout = false;
        });

        if (me.autoLoad) {
            me.load(me.autoLoadOptions);
        }
    },
});

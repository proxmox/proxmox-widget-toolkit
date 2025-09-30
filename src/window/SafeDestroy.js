// Pop-up a message window where the user has to manually enter the resource ID to enable the
// destroy confirmation button to ensure that they got the correct resource selected for.
Ext.define('Proxmox.window.SafeDestroy', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxSafeDestroy',

    title: gettext('Confirm'),
    modal: true,
    buttonAlign: 'center',
    bodyPadding: 10,
    width: 450,
    layout: { type: 'hbox' },
    defaultFocus: 'confirmField',
    showProgress: false,

    additionalItems: [],

    // gets called if we have a progress bar or taskview and it detected that
    // the task finished. function(success)
    taskDone: Ext.emptyFn,

    // gets called when the api call is finished, right at the beginning
    // function(success, response, options)
    apiCallDone: Ext.emptyFn,

    config: {
        item: {
            id: undefined,
            formattedIdentifier: undefined,
        },
        url: undefined,
        note: undefined,
        taskName: undefined,
        params: {},
    },

    getParams: function () {
        let me = this;

        if (Ext.Object.isEmpty(me.params)) {
            return '';
        }
        return '?' + Ext.Object.toQueryString(me.params);
    },

    controller: {
        xclass: 'Ext.app.ViewController',

        control: {
            'field[name=confirm]': {
                change: function (f, value) {
                    const view = this.getView();
                    const removeButton = this.lookupReference('removeButton');
                    if (value === view.getItem().id.toString()) {
                        removeButton.enable();
                    } else {
                        removeButton.disable();
                    }
                },
                specialkey: function (field, event) {
                    const removeButton = this.lookupReference('removeButton');
                    if (!removeButton.isDisabled() && event.getKey() === event.ENTER) {
                        removeButton.fireEvent('click', removeButton, event);
                    }
                },
            },
            'button[reference=removeButton]': {
                click: function () {
                    const view = this.getView();
                    Proxmox.Utils.API2Request({
                        url: view.getUrl() + view.getParams(),
                        method: 'DELETE',
                        waitMsgTarget: view,
                        failure: function (response, opts) {
                            view.apiCallDone(false, response, opts);
                            view.close();
                            Ext.Msg.alert('Error', response.htmlStatus);
                        },
                        success: function (response, options) {
                            const hasProgressBar = !!(view.showProgress && response.result.data);

                            view.apiCallDone(true, response, options);

                            if (hasProgressBar) {
                                // stay around so we can trigger our close events
                                // when background action is completed
                                view.hide();

                                const upid = response.result.data;
                                const win = Ext.create('Proxmox.window.TaskProgress', {
                                    upid: upid,
                                    taskDone: view.taskDone,
                                    listeners: {
                                        destroy: function () {
                                            view.close();
                                        },
                                    },
                                });
                                win.show();
                            } else {
                                view.close();
                            }
                        },
                    });
                },
            },
        },
    },

    initComponent: function () {
        let me = this;

        let body = {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'component',
                    cls: [
                        Ext.baseCSSPrefix + 'message-box-icon',
                        Ext.baseCSSPrefix + 'dlg-icon',
                        Ext.baseCSSPrefix + 'message-box-warning',
                    ],
                },
            ],
        };

        const itemId = me.getItem().id;
        if (!Ext.isDefined(itemId)) {
            throw 'no ID specified';
        }

        const taskName = me.getTaskName();
        let label = `${gettext('Please enter the ID to confirm')} (${itemId})`;

        let content = {
            xtype: 'container',
            layout: 'vbox',
            items: [
                {
                    xtype: 'component',
                    reference: 'messageCmp',
                    html: Ext.htmlEncode(
                        Proxmox.Utils.format_task_description(
                            taskName,
                            me.getItem().formattedIdentifier ?? itemId,
                        ),
                    ),
                },
                {
                    itemId: 'confirmField',
                    reference: 'confirmField',
                    xtype: 'textfield',
                    name: 'confirm',
                    padding: '5 0 0 0',
                    width: 340,
                    labelWidth: 240,
                    fieldLabel: label,
                    hideTrigger: true,
                    allowBlank: false,
                },
            ],
        };

        if (me.additionalItems && me.additionalItems.length > 0) {
            content.items.push({
                xtype: 'container',
                height: 5,
            });
            for (const item of me.additionalItems) {
                content.items.push(item);
            }
        }

        if (Ext.isDefined(me.getNote())) {
            content.items.push({
                xtype: 'container',
                reference: 'noteContainer',
                flex: 1,
                layout: {
                    type: 'vbox',
                },
                items: [
                    {
                        xtype: 'component',
                        reference: 'noteCmp',
                        userCls: 'pmx-hint',
                        html: `<span title="${me.getNote()}">${me.getNote()}</span>`,
                    },
                ],
            });
        }

        body.items.push(content);

        me.items = [body];

        let buttons = [
            {
                xtype: 'button',
                reference: 'removeButton',
                text: gettext('Remove'),
                disabled: true,
                width: 75,
                margin: '0 5 0 0',
            },
        ];

        me.dockedItems = [
            {
                xtype: 'container',
                dock: 'bottom',
                cls: ['x-toolbar', 'x-toolbar-footer'],
                layout: {
                    type: 'hbox',
                    pack: 'center',
                },
                items: buttons,
            },
        ];

        me.callParent();
    },
});

// Pop-up a message window where the user has to confirm their intent to delete an item.
// Optionally, an additional textfield can be added, requiring the user to enter the ID
// of the given item again to confirm their intent.
Ext.define('Proxmox.window.ConfirmRemoveDialog', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxConfirmRemoveDialog',

    title: gettext('Confirm'),
    modal: true,
    buttonAlign: 'center',
    bodyPadding: 10,
    width: 450,
    layout: { type: 'hbox' },
    defaultFocus: 'confirmField',
    showProgress: false,

    // if set to true, a warning sign will be displayed and entering the ID will
    // be required before removal is possible. If set to false, a question mark
    // will be displayed.
    dangerous: false,

    confirmButtonText: gettext('Yes'),
    // second button will only be displayed if a text is given
    declineButtonText: gettext('No'),

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
        },
        text: undefined,
        url: undefined,
        note: undefined,
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
                    const confirmButton = this.lookupReference('confirmButton');
                    if (value === view.getItem().id.toString()) {
                        confirmButton.enable();
                    } else {
                        confirmButton.disable();
                    }
                },
                specialkey: function (field, event) {
                    const confirmButton = this.lookupReference('confirmButton');
                    if (!confirmButton.isDisabled() && event.getKey() === event.ENTER) {
                        confirmButton.fireEvent('click', confirmButton, event);
                    }
                },
            },
            'button[reference=confirmButton]': {
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
            'button[reference=declineButton]': {
                click: function () {
                    const view = this.getView();
                    view.close();
                },
            },
        },
    },

    initComponent: function () {
        let me = this;

        let cls = [Ext.baseCSSPrefix + 'message-box-icon', Ext.baseCSSPrefix + 'dlg-icon'];
        if (me.dangerous) {
            cls.push(Ext.baseCSSPrefix + 'message-box-warning');
        } else {
            cls.push(Ext.baseCSSPrefix + 'message-box-question');
        }

        let body = {
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'component',
                    cls: cls,
                },
            ],
        };

        const itemId = me.getItem().id;
        if (!Ext.isDefined(itemId)) {
            throw 'no ID specified';
        }

        let content = {
            xtype: 'container',
            layout: 'vbox',
            items: [
                {
                    xtype: 'component',
                    reference: 'messageCmp',
                    html: Ext.htmlEncode(me.getText()),
                },
            ],
        };

        if (me.dangerous) {
            let label = `${gettext('Please enter the ID to confirm')} (${itemId})`;
            content.items.push({
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
            });
        }

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
                reference: 'confirmButton',
                text: me.confirmButtonText,
                disabled: me.dangerous,
                width: 75,
                margin: '0 5 0 0',
            },
        ];

        if (me.declineButtonText) {
            buttons.push({
                xtype: 'button',
                reference: 'declineButton',
                text: me.declineButtonText,
                width: 75,
            });
        }

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

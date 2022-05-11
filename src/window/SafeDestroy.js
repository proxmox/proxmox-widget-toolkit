/* Popup a message window
 * where the user has to manually enter the resource ID
 * to enable the destroy button
 */
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
	},
	url: undefined,
	note: undefined,
	taskName: undefined,
	params: {},
    },

    getParams: function() {
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
		change: function(f, value) {
		    const view = this.getView();
		    const removeButton = this.lookupReference('removeButton');
		    if (value === view.getItem().id.toString()) {
			removeButton.enable();
		    } else {
			removeButton.disable();
		    }
		},
		specialkey: function(field, event) {
		    const removeButton = this.lookupReference('removeButton');
		    if (!removeButton.isDisabled() && event.getKey() === event.ENTER) {
			removeButton.fireEvent('click', removeButton, event);
		    }
		},
	    },
           'button[reference=removeButton]': {
		click: function() {
		    const view = this.getView();
		    Proxmox.Utils.API2Request({
			url: view.getUrl() + view.getParams(),
			method: 'DELETE',
			waitMsgTarget: view,
			failure: function(response, opts) {
			    view.apiCallDone(false, response, opts);
			    view.close();
			    Ext.Msg.alert('Error', response.htmlStatus);
			},
			success: function(response, options) {
			    const hasProgressBar = !!(view.showProgress &&
				response.result.data);

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
					destroy: function() {
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

    buttons: [
	{
	    reference: 'removeButton',
	    text: gettext('Remove'),
	    disabled: true,
	},
    ],

    initComponent: function() {
	let me = this;

	me.items = [
	    {
		xtype: 'component',
		cls: [
		    Ext.baseCSSPrefix + 'message-box-icon',
		    Ext.baseCSSPrefix + 'message-box-warning',
		    Ext.baseCSSPrefix + 'dlg-icon',
		],
	    },
	    {
		xtype: 'container',
		flex: 1,
		layout: {
		    type: 'vbox',
		    align: 'stretch',
		},
		items: [
		    {
			xtype: 'component',
			reference: 'messageCmp',
		    },
		    {
			itemId: 'confirmField',
			reference: 'confirmField',
			xtype: 'textfield',
			name: 'confirm',
			labelWidth: 300,
			hideTrigger: true,
			allowBlank: false,
		    },
		]
		.concat(me.additionalItems)
		.concat([
		    {
			xtype: 'container',
			reference: 'noteContainer',
			flex: 1,
			hidden: true,
			layout: {
			    type: 'vbox',
			},
			items: [
			    {
				xtype: 'component',
				reference: 'noteCmp',
				userCls: 'pmx-hint',
			    },
			],
		    },
		]),
	    },
	];

	me.callParent();

	const itemId = me.getItem().id;
	if (!Ext.isDefined(itemId)) {
	    throw "no ID specified";
	}

	if (Ext.isDefined(me.getNote())) {
	    me.lookupReference('noteCmp').setHtml(`<span title="${me.getNote()}">${me.getNote()}</span>`);
	    const noteContainer = me.lookupReference('noteContainer');
	    noteContainer.setHidden(false);
	    noteContainer.setDisabled(false);
	}

	let taskName = me.getTaskName();
	if (Ext.isDefined(taskName)) {
	    me.lookupReference('messageCmp').setHtml(
		Proxmox.Utils.format_task_description(taskName, itemId),
	    );
	} else {
	    throw "no task name specified";
	}

	me.lookupReference('confirmField')
	    .setFieldLabel(`${gettext('Please enter the ID to confirm')} (${itemId})`);
    },
});

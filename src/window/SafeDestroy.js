/* Popup a message window
 * where the user has to manually enter the resource ID
 * to enable the destroy button
 */
Ext.define('Proxmox.window.SafeDestroy', {
    extend: 'Ext.window.Window',
    alias: 'proxmoxSafeDestroy',

    title: gettext('Confirm'),
    modal: true,
    buttonAlign: 'center',
    bodyPadding: 10,
    width: 450,
    layout: { type: 'hbox' },
    defaultFocus: 'confirmField',
    showProgress: false,

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
			    view.close();
			    Ext.Msg.alert('Error', response.htmlStatus);
			},
			success: function(response, options) {
			    const hasProgressBar = !!(view.showProgress &&
				response.result.data);

			    if (hasProgressBar) {
				// stay around so we can trigger our close events
				// when background action is completed
				view.hide();

				const upid = response.result.data;
				const win = Ext.create('Proxmox.window.TaskProgress', {
				    upid: upid,
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

    items: [
	{
	    xtype: 'component',
	    cls: [Ext.baseCSSPrefix + 'message-box-icon',
		   Ext.baseCSSPrefix + 'message-box-warning',
		   Ext.baseCSSPrefix + 'dlg-icon'],
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
		{
		    xtype: 'container',
		    reference: 'noteContainer',
		    flex: 1,
		    hidden: true,
		    layout: {
			type: 'vbox',
			align: 'middle',
		    },
		    height: 25,
		    items: [
			{
			    xtype: 'component',
			    reference: 'noteCmp',
			    width: '300px',
			    style: 'font-size: smaller; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;',
			},
		    ],
		},
	    ],
	},
    ],
    buttons: [
	{
	    reference: 'removeButton',
	    text: gettext('Remove'),
	    disabled: true,
	},
    ],

    initComponent: function() {
	let me = this;

	me.callParent();

	const item = me.getItem();

	if (!Ext.isDefined(item.id)) {
	    throw "no ID specified";
	}

	const messageCmp = me.lookupReference('messageCmp');
	const noteCmp = me.lookupReference('noteCmp');
	let msg;

	if (Ext.isDefined(me.getNote())) {
	    noteCmp.setHtml(`<span title="${me.getNote()}">${me.getNote()}</span>`);
	    const noteContainer = me.lookupReference('noteContainer');
	    noteContainer.setHidden(false);
	    noteContainer.setDisabled(false);
	}

	if (Ext.isDefined(me.getTaskName())) {
	    msg = Proxmox.Utils.format_task_description(me.getTaskName(), item.id);
	    messageCmp.setHtml(msg);
	} else {
	    throw "no task name specified";
	}

	const confirmField = me.lookupReference('confirmField');
	msg = gettext('Please enter the ID to confirm') +
	    ' (' + item.id + ')';
	confirmField.setFieldLabel(msg);
    },
});

/* Button features:
 * - observe selection changes to enable/disable the button using enableFn()
 * - pop up confirmation dialog using confirmMsg()
 */
Ext.define('Proxmox.button.Button', {
    extend: 'Ext.button.Button',
    alias: 'widget.proxmoxButton',

    // the selection model to observe
    selModel: undefined,

    // if 'false' handler will not be called (button disabled)
    enableFn: function(record) { },

    // function(record) or text
    confirmMsg: false,

    // take special care in confirm box (select no as default).
    dangerous: false,

    initComponent: function() {
	/*jslint confusion: true */

        var me = this;

	if (me.handler) {
	    me.realHandler = me.handler;

	    me.handler = function(button, event) {
		var rec, msg;
		if (me.selModel) {
		    rec = me.selModel.getSelection()[0];
		    if (!rec || (me.enableFn(rec) === false)) {
			return;
		    }
		}

		if (me.confirmMsg) {
		    msg = me.confirmMsg;
		    if (Ext.isFunction(me.confirmMsg)) {
			msg = me.confirmMsg(rec);
		    }
		    Ext.MessageBox.defaultButton = me.dangerous ? 2 : 1;
		    Ext.Msg.show({
			title: gettext('Confirm'),
			icon: me.dangerous ? Ext.Msg.WARNING : Ext.Msg.QUESTION,
			msg: msg,
			buttons: Ext.Msg.YESNO,
			callback: function(btn) {
			    if (btn !== 'yes') {
				return;
			    }
			    me.realHandler(button, event, rec);
			}
		    });
		} else {
		    me.realHandler(button, event, rec);
		}
	    };
	}

	me.callParent();

	if (me.selModel) {

	    me.mon(me.selModel, "selectionchange", function() {
		var rec = me.selModel.getSelection()[0];
		if (!rec || (me.enableFn(rec) === false)) {
		    me.setDisabled(true);
		} else  {
		    me.setDisabled(false);
		}
	    });
	}
    }
});


Ext.define('Proxmox.button.StdRemoveButton', {
    extend: 'Proxmox.button.Button',
    alias: 'widget.proxmoxStdRemoveButton',

    text: gettext('Remove'),

    disabled: true,

    baseurl: undefined,

    callback: function(options, success, response) {},

    getRecordName: function(rec) { return rec.getId() },

    confirmMsg: function (rec) {
	var me = this;

	var name = me.getRecordName(rec);
	return Ext.String.format(
	    gettext('Are you sure you want to remove entry {0}'),
	    "'" + name + "'");
    },

    handler: function(btn, event, rec) {
	var me = this;

	Proxmox.Utils.API2Request({
	    url: me.baseurl + '/' + rec.getId(),
	    method: 'DELETE',
	    waitMsgTarget: me.waitMsgTarget,
	    callback: me.callback,
	    failure: function (response, opts) {
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
	    }
	});
    }
});

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
    enableFn: function(record) {
	// return undefined by default
    },

    // function(record) or text
    confirmMsg: false,

    // take special care in confirm box (select no as default).
    dangerous: false,

    // is used to get the parent container for its selection model
    parentXType: 'grid',

    initComponent: function() {
        let me = this;

	if (me.handler) {
	    // Note: me.realHandler may be a string (see named scopes)
	    let realHandler = me.handler;

	    me.handler = function(button, event) {
		let rec, msg;
		if (me.selModel) {
		    rec = me.selModel.getSelection()[0];
		    if (!rec || me.enableFn(rec) === false) {
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
			message: msg,
			buttons: Ext.Msg.YESNO,
			defaultFocus: me.dangerous ? 'no' : 'yes',
			callback: function(btn) {
			    if (btn !== 'yes') {
				return;
			    }
			    Ext.callback(realHandler, me.scope, [button, event, rec], 0, me);
			},
		    });
		} else {
		    Ext.callback(realHandler, me.scope, [button, event, rec], 0, me);
		}
	    };
	}

	me.callParent();

	let grid;
	if (!me.selModel && me.selModel !== null && me.selModel !== false) {
	    let parent = me.up(me.parentXType);
	    if (parent && parent.selModel) {
		me.selModel = parent.selModel;
	    }
	}

	if (me.waitMsgTarget === true) {
	    grid = me.up('grid');
	    if (grid) {
		me.waitMsgTarget = grid;
	    } else {
		throw "unable to find waitMsgTarget";
	    }
	}

	if (me.selModel) {
	    me.mon(me.selModel, "selectionchange", function() {
		let rec = me.selModel.getSelection()[0];
		if (!rec || me.enableFn(rec) === false) {
		    me.setDisabled(true);
		} else {
		    me.setDisabled(false);
		}
	    });
	}
    },
});


Ext.define('Proxmox.button.StdRemoveButton', {
    extend: 'Proxmox.button.Button',
    alias: 'widget.proxmoxStdRemoveButton',

    text: gettext('Remove'),

    disabled: true,

    // time to wait for removal task to finish
    delay: undefined,

    config: {
	baseurl: undefined,
    },

    getUrl: function(rec) {
	let me = this;

	if (me.selModel) {
	    return me.baseurl + '/' + rec.getId();
	} else {
	    return me.baseurl;
	}
    },

    // also works with names scopes
    callback: function(options, success, response) {
	// do nothing by default
    },

    getRecordName: (rec) => rec.getId(),

    confirmMsg: function(rec) {
	let me = this;

	let name = me.getRecordName(rec);
	return Ext.String.format(gettext('Are you sure you want to remove entry {0}'), `'${name}'`);
    },

    handler: function(btn, event, rec) {
	let me = this;

	let url = me.getUrl(rec);

	if (typeof me.delay !== 'undefined' && me.delay >= 0) {
	    url += "?delay=" + me.delay;
	}

	Proxmox.Utils.API2Request({
	    url: url,
	    method: 'DELETE',
	    waitMsgTarget: me.waitMsgTarget,
	    callback: function(options, success, response) {
		Ext.callback(me.callback, me.scope, [options, success, response], 0, me);
	    },
	    failure: function(response, opts) {
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
	    },
	});
    },
    initComponent: function() {
	let me = this;

	// enable by default if no seleModel is there and disabled not set
	if (me.initialConfig.disabled === undefined &&
	    (me.selModel === null || me.selModel === false)) {
	    me.disabled = false;
	}

	me.callParent();
    },
});

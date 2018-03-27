// fixme: how can we avoid those lint errors?
/*jslint confusion: true */
Ext.define('Proxmox.window.Edit', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxWindowEdit',

    // autoLoad trigger a load() after component creation
    autoLoad: false,

    resizable: false,

    // use this tio atimatically generate a title like
    // Create: <subject>
    subject: undefined,

    // set isCreate to true if you want a Create button (instead
    // OK and RESET)
    isCreate: false,

    // set to true if you want an Add button (instead of Create)
    isAdd: false,

    // set to true if you want an Remove button (instead of Create)
    isRemove: false,

    // custom submitText
    submitText: undefined,

    backgroundDelay: 0,

    // needed for finding the reference to submitbutton
    // because we do not have a controller
    referenceHolder: true,
    defaultButton: 'submitbutton',

    // finds the first form field
    defaultFocus: 'field',

    showProgress: false,

    showTaskViewer: false,

    // gets called if we have a progress bar or taskview and it detected that
    // the task finished. function(success)
    taskDone: Ext.emptyFn,

    // assign a reference from docs, to add a help button docked to the
    // bottom of the window. If undefined we magically fall back to the
    // onlineHelp of our first item, if set.
    onlineHelp: undefined,

    isValid: function() {
	var me = this;

	var form = me.formPanel.getForm();
	return form.isValid();
    },

    getValues: function(dirtyOnly) {
	var me = this;

        var values = {};

	var form = me.formPanel.getForm();

        form.getFields().each(function(field) {
            if (!field.up('inputpanel') && (!dirtyOnly || field.isDirty())) {
                Proxmox.Utils.assemble_field_data(values, field.getSubmitData());
            }
        });

	Ext.Array.each(me.query('inputpanel'), function(panel) {
	    Proxmox.Utils.assemble_field_data(values, panel.getValues(dirtyOnly));
	});

        return values;
    },

    setValues: function(values) {
	var me = this;

	var form = me.formPanel.getForm();

	Ext.iterate(values, function(fieldId, val) {
	    var field = form.findField(fieldId);
	    if (field && !field.up('inputpanel')) {
               field.setValue(val);
                if (form.trackResetOnLoad) {
                    field.resetOriginalValue();
                }
            }
	});

	Ext.Array.each(me.query('inputpanel'), function(panel) {
	    panel.setValues(values);
	});
    },

    submit: function() {
	var me = this;

	var form = me.formPanel.getForm();

	var values = me.getValues();
	Ext.Object.each(values, function(name, val) {
	    if (values.hasOwnProperty(name)) {
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

	var url =  me.url;
	if (me.method === 'DELETE') {
	    url = url + "?" + Ext.Object.toQueryString(values);
	    values = undefined;
	}

	Proxmox.Utils.API2Request({
	    url: url,
	    waitMsgTarget: me,
	    method: me.method || (me.backgroundDelay ? 'POST' : 'PUT'),
	    params: values,
	    failure: function(response, options) {
		if (response.result && response.result.errors) {
		    form.markInvalid(response.result.errors);
		}
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
	    },
	    success: function(response, options) {
		var hasProgressBar = (me.backgroundDelay || me.showProgress || me.showTaskViewer) &&
		    response.result.data ? true : false;

		if (hasProgressBar) {
		    // stay around so we can trigger our close events
		    // when background action is completed
		    me.hide();

		    var upid = response.result.data;
		    var viewerClass = me.showTaskViewer ? 'Viewer' : 'Progress';
		    var win = Ext.create('Proxmox.window.Task' + viewerClass, {
			upid: upid,
			taskDone: me.taskDone,
			listeners: {
			    destroy: function () {
				me.close();
			    }
			}
		    });
		    win.show();
		} else {
		    me.close();
		}
	    }
	});
    },

    load: function(options) {
	var me = this;

	var form = me.formPanel.getForm();

	options = options || {};

	var newopts = Ext.apply({
	    waitMsgTarget: me
	}, options);

	var createWrapper = function(successFn) {
	    Ext.apply(newopts, {
		url: me.url,
		method: 'GET',
		success: function(response, opts) {
		    form.clearInvalid();
		    me.digest = response.result.data.digest;
		    if (successFn) {
			successFn(response, opts);
		    } else {
			me.setValues(response.result.data);
		    }
		    // hack: fix ExtJS bug
		    Ext.Array.each(me.query('radiofield'), function(f) {
			f.resetOriginalValue();
		    });
		},
		failure: function(response, opts) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus, function() {
			me.close();
		    });
		}
	    });
	};

	createWrapper(options.success);

	Proxmox.Utils.API2Request(newopts);
    },

    initComponent : function() {
	var me = this;

	if (!me.url) {
	    throw "no url specified";
	}

	if (me.create) {throw "deprecated parameter, use isCreate";}

	var items = Ext.isArray(me.items) ? me.items : [ me.items ];

	me.items = undefined;

	me.formPanel = Ext.create('Ext.form.Panel', {
	    url: me.url,
	    method: me.method || 'PUT',
	    trackResetOnLoad: true,
	    bodyPadding: 10,
	    border: false,
	    defaults: Ext.apply({}, me.defaults, {
		border: false
	    }),
	    fieldDefaults: Ext.apply({}, me.fieldDefaults, {
		labelWidth: 100,
		anchor: '100%'
            }),
	    items: items
	});

	var inputPanel = me.formPanel.down('inputpanel');

	var form = me.formPanel.getForm();

	var submitText;
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

	var submitBtn = Ext.create('Ext.Button', {
	    reference: 'submitbutton',
	    text: submitText,
	    disabled: !me.isCreate,
	    handler: function() {
		me.submit();
	    }
	});

	var resetBtn = Ext.create('Ext.Button', {
	    text: 'Reset',
	    disabled: true,
	    handler: function(){
		form.reset();
	    }
	});

	var set_button_status = function() {
	    var valid = form.isValid();
	    var dirty = form.isDirty();
	    submitBtn.setDisabled(!valid || !(dirty || me.isCreate));
	    resetBtn.setDisabled(!dirty);
	};

	form.on('dirtychange', set_button_status);
	form.on('validitychange', set_button_status);

	var colwidth = 300;
	if (me.fieldDefaults && me.fieldDefaults.labelWidth) {
	    colwidth += me.fieldDefaults.labelWidth - 100;
	}

	var twoColumn = inputPanel &&
	    (inputPanel.column1 || inputPanel.column2);

	if (me.subject && !me.title) {
	    me.title = Proxmox.Utils.dialog_title(me.subject, me.isCreate, me.isAdd);
	}

	if (me.isCreate) {
		me.buttons = [ submitBtn ] ;
	} else {
		me.buttons = [ submitBtn, resetBtn ];
	}

	var onlineHelp = me.onlineHelp;
	if (!onlineHelp && inputPanel && inputPanel.onlineHelp) {
	    onlineHelp = inputPanel.onlineHelp;
	}

	if (onlineHelp) {
	    var helpButton = Ext.create('Proxmox.button.Help');
	    me.buttons.unshift(helpButton, '->');
	    Ext.GlobalEvents.fireEvent('proxmoxShowHelp', onlineHelp);
	}

	Ext.applyIf(me, {
	    modal: true,
	    width: twoColumn ? colwidth*2 : colwidth,
	    border: false,
	    items: [ me.formPanel ]
	});

	me.callParent();

	// always mark invalid fields
	me.on('afterlayout', function() {
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
	    me.load();
	}
    }
});

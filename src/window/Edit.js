Ext.define('Proxmox.window.Edit', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxWindowEdit',

    // autoLoad trigger a load() after component creation
    autoLoad: false,
    // set extra options like params for the load request
    autoLoadOptions: undefined,

    resizable: false,

    // use this to atimatically generate a title like `Create: <subject>`
    subject: undefined,

    // set isCreate to true if you want a Create button (instead OK and RESET)
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

    isValid: function() {
	let me = this;

	let form = me.formPanel.getForm();
	return form.isValid();
    },

    getValues: function(dirtyOnly) {
	let me = this;

	let values = {};
	let form = me.formPanel.getForm();

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
	let me = this;

	let form = me.formPanel.getForm();
	let formfields = form.getFields();

	Ext.iterate(values, function(id, val) {
	    let fields = formfields.filterBy((f) =>
	        (f.id === id || f.name === id || f.dataIndex === id) && !f.up('inputpanel'),
	    );
	    fields.each((field) => {
		field.setValue(val);
		if (form.trackResetOnLoad) {
		    field.resetOriginalValue();
		}
	    });
	});

	Ext.Array.each(me.query('inputpanel'), function(panel) {
	    panel.setValues(values);
	});
    },

    setSubmitText: function(text) {
	this.lookup('submitbutton').setText(text);
    },

    submit: function() {
	let me = this;

	let form = me.formPanel.getForm();

	let values = me.getValues();
	Ext.Object.each(values, function(name, val) {
	    if (Object.prototype.hasOwnProperty.call(values, name)) {
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

	let url = me.url;
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
		me.apiCallDone(false, response, options);

		if (response.result && response.result.errors) {
		    form.markInvalid(response.result.errors);
		}
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
	    },
	    success: function(response, options) {
		let hasProgressBar =
		    (me.backgroundDelay || me.showProgress || me.showTaskViewer) &&
		    response.result.data;

		me.apiCallDone(true, response, options);

		if (hasProgressBar) {
		    // stay around so we can trigger our close events
		    // when background action is completed
		    me.hide();

		    let upid = response.result.data;
		    let viewerClass = me.showTaskViewer ? 'Viewer' : 'Progress';
		    Ext.create('Proxmox.window.Task' + viewerClass, {
			autoShow: true,
			upid: upid,
			taskDone: me.taskDone,
			listeners: {
			    destroy: function() {
				me.close();
			    },
			},
		    });
		} else {
		    me.close();
		}
	    },
	});
    },

    load: function(options) {
	let me = this;

	let form = me.formPanel.getForm();

	options = options || {};

	let newopts = Ext.apply({
	    waitMsgTarget: me,
	}, options);

	let createWrapper = function(successFn) {
	    Ext.apply(newopts, {
		url: me.url,
		method: 'GET',
		success: function(response, opts) {
		    form.clearInvalid();
		    me.digest = response.result.digest || response.result.data.digest;
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
		},
	    });
	};

	createWrapper(options.success);

	Proxmox.Utils.API2Request(newopts);
    },

    initComponent: function() {
	let me = this;

	if (!me.url) {
	    throw "no url specified";
	}

	if (me.create) {throw "deprecated parameter, use isCreate";}

	let items = Ext.isArray(me.items) ? me.items : [me.items];

	me.items = undefined;

	me.formPanel = Ext.create('Ext.form.Panel', {
	    url: me.url,
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
	    handler: function() {
		me.submit();
	    },
	});

	let resetBtn = Ext.create('Ext.Button', {
	    text: 'Reset',
	    disabled: true,
	    handler: function() {
		form.reset();
	    },
	});

	let set_button_status = function() {
	    let valid = form.isValid();
	    let dirty = form.isDirty();
	    submitBtn.setDisabled(!valid || !(dirty || me.isCreate));
	    resetBtn.setDisabled(!dirty);

	    if (inputPanel && inputPanel.hasAdvanced) {
		// we want to show the advanced options
		// as soon as some of it is not valid
		let advancedItems = me.down('#advancedContainer').query('field');
		let allAdvancedValid = true;
		advancedItems.forEach(function(field) {
		    if (!field.isValid()) {
			allAdvancedValid = false;
		    }
		});

		if (!allAdvancedValid) {
		    inputPanel.setAdvancedVisible(true);
		    me.down('#advancedcb').setValue(true);
		}
	    }
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

	if (me.isCreate) {
		me.buttons = [submitBtn];
	} else {
		me.buttons = [submitBtn, resetBtn];
	}

	if (inputPanel && inputPanel.hasAdvanced) {
	    let sp = Ext.state.Manager.getProvider();
	    let advchecked = sp.get('proxmox-advanced-cb');
	    inputPanel.setAdvancedVisible(advchecked);
	    me.buttons.unshift(
	       {
		   xtype: 'proxmoxcheckbox',
		   itemId: 'advancedcb',
		   boxLabelAlign: 'before',
		   boxLabel: gettext('Advanced'),
		   stateId: 'proxmox-advanced-cb',
		   value: advchecked,
		   listeners: {
		       change: function(cb, val) {
			   inputPanel.setAdvancedVisible(val);
			   sp.set('proxmox-advanced-cb', val);
		       },
		   },
	       },
	    );
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
	    width: twoColumn ? colwidth*2 : colwidth,
	    border: false,
	    items: [me.formPanel],
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
	    me.load(me.autoLoadOptions);
	}
    },
});

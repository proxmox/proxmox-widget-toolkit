Ext.define('Proxmox.window.SyncWindow', {
    extend: 'Ext.window.Window',

    title: gettext('Realm Sync'),

    width: 600,
    bodyPadding: 10,
    modal: true,
    resizable: false,

    controller: {
	xclass: 'Ext.app.ViewController',

	control: {
	    'form': {
		validitychange: function(field, valid) {
		    this.lookup('preview_btn').setDisabled(!valid);
		    this.lookup('sync_btn').setDisabled(!valid);
		},
	    },
	    'button': {
		click: function(btn) {
		    this.sync_realm(btn.reference === 'preview_btn');
		},
	    },
	},

	sync_realm: function(is_preview) {
	    let view = this.getView();
	    let ipanel = this.lookup('ipanel');
	    let params = ipanel.getValues();

	    let vanished_opts = [];
	    ['acl', 'entry', 'properties'].forEach((prop) => {
		if (params[`remove-vanished-${prop}`]) {
		    vanished_opts.push(prop);
		}
		delete params[`remove-vanished-${prop}`];
	    });
	    if (vanished_opts.length > 0) {
		params['remove-vanished'] = vanished_opts.join(';');
	    }

	    params['dry-run'] = is_preview ? 1 : 0;
	    Proxmox.Utils.API2Request({
		url: `/access/domains/${view.realm}/sync`,
		waitMsgTarget: view,
		method: 'POST',
		params,
		failure: (response) => {
		    view.show();
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		},
		success: (response) => {
		    view.hide();
		    Ext.create('Proxmox.window.TaskViewer', {
			upid: response.result.data,
			listeners: {
			    destroy: () => {
				if (is_preview) {
				    view.show();
				} else {
				    view.close();
				}
			    },
			},
		    }).show();
		},
	    });
	},
    },

    items: [
	{
	    xtype: 'form',
	    reference: 'form',
	    border: false,
	    fieldDefaults: {
		labelWidth: 100,
		anchor: '100%',
	    },
	    items: [{
		xtype: 'inputpanel',
		reference: 'ipanel',
		column1: [
		    {
			xtype: 'proxmoxKVComboBox',
			value: 'true',
			deleteEmpty: false,
			allowBlank: false,
			comboItems: [
			    ['true', Proxmox.Utils.yesText],
			    ['false', Proxmox.Utils.noText],
			],
			name: 'enable-new',
			fieldLabel: gettext('Enable new'),
		    },
		],

		column2: [
		],

		columnB: [
		    {
			xtype: 'fieldset',
			title: gettext('Remove Vanished Options'),
			items: [
			    {
				xtype: 'proxmoxcheckbox',
				fieldLabel: gettext('ACL'),
				name: 'remove-vanished-acl',
				boxLabel: gettext('Remove ACLs of vanished users and groups.'),
			    },
			    {
				xtype: 'proxmoxcheckbox',
				fieldLabel: gettext('Entry'),
				name: 'remove-vanished-entry',
				boxLabel: gettext('Remove vanished user and group entries.'),
			    },
			    {
				xtype: 'proxmoxcheckbox',
				fieldLabel: gettext('Properties'),
				name: 'remove-vanished-properties',
				boxLabel: gettext('Remove vanished properties from synced users.'),
			    },
			],
		    },
		    {
			xtype: 'displayfield',
			reference: 'defaulthint',
			value: gettext('Default sync options can be set by editing the realm.'),
			userCls: 'pmx-hint',
			hidden: true,
		    },
		],
	    }],
	},
    ],

    buttons: [
	'->',
	{
	    text: gettext('Preview'),
	    reference: 'preview_btn',
	},
	{
	    text: gettext('Sync'),
	    reference: 'sync_btn',
	},
    ],

    initComponent: function() {
	if (!this.realm) {
	    throw "no realm defined";
	}

	if (!this.type) {
	    throw "no realm type defined";
	}

	this.callParent();

	Proxmox.Utils.API2Request({
	    url: `/config/access/${this.type}/${this.realm}`,
	    waitMsgTarget: this,
	    method: 'GET',
	    failure: (response) => {
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		this.close();
	    },
	    success: (response) => {
		let default_options = response.result.data['sync-defaults-options'];
		if (default_options) {
		    let options = Proxmox.Utils.parsePropertyString(default_options);
		    if (options['remove-vanished']) {
			let opts = options['remove-vanished'].split(';');
			for (const opt of opts) {
			    options[`remove-vanished-${opt}`] = 1;
			}
		    }
		    let ipanel = this.lookup('ipanel');
		    ipanel.setValues(options);
		} else {
		    this.lookup('defaulthint').setVisible(true);
		}

		// check validity for button state
		this.lookup('form').isValid();
	    },
	});
    },
});

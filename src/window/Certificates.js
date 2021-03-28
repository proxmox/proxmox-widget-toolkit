Ext.define('Proxmox.window.CertificateViewer', {
    extend: 'Proxmox.window.Edit',
    xtype: 'pmxCertViewer',

    title: gettext('Certificate'),

    fieldDefaults: {
	labelWidth: 120,
    },
    width: 800,
    resizable: true,

    items: [
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Name'),
	    name: 'filename',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Fingerprint'),
	    name: 'fingerprint',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Issuer'),
	    name: 'issuer',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Subject'),
	    name: 'subject',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Public Key Type'),
	    name: 'public-key-type',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Public Key Size'),
	    name: 'public-key-bits',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Valid Since'),
	    renderer: Proxmox.Utils.render_timestamp,
	    name: 'notbefore',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Expires'),
	    renderer: Proxmox.Utils.render_timestamp,
	    name: 'notafter',
	},
	{
	    xtype: 'displayfield',
	    fieldLabel: gettext('Subject Alternative Names'),
	    name: 'san',
	    renderer: Proxmox.Utils.render_san,
	},
	{
	    xtype: 'textarea',
	    editable: false,
	    grow: true,
	    growMax: 200,
	    fieldLabel: gettext('Certificate'),
	    name: 'pem',
	},
    ],

    initComponent: function() {
	var me = this;

	if (!me.cert) {
	    throw "no cert given";
	}

	if (!me.url) {
	    throw "no url given";
	}

	me.callParent();

	// hide OK/Reset button, because we just want to show data
	me.down('toolbar[dock=bottom]').setVisible(false);

	me.load({
	    success: function(response) {
		if (Ext.isArray(response.result.data)) {
		    Ext.Array.each(response.result.data, function(item) {
			if (item.filename === me.cert) {
			    me.setValues(item);
			    return false;
			}
			return true;
		    });
		}
	    },
	});
    },
});

Ext.define('Proxmox.window.CertificateUpload', {
    extend: 'Proxmox.window.Edit',
    xtype: 'pmxCertUpload',

    title: gettext('Upload Custom Certificate'),
    resizable: false,
    isCreate: true,
    submitText: gettext('Upload'),
    method: 'POST',
    width: 600,

    // whether the UI needs a reload after this
    reloadUi: undefined,

    apiCallDone: function(success, response, options) {
	let me = this;

	if (!success || !me.reloadUi) {
	    return;
	}

	Ext.getBody().mask(
	    gettext('API server will be restarted to use new certificates, please reload web-interface!'),
	    ['pve-static-mask'],
	);
	// try to reload after 10 seconds automatically
	Ext.defer(() => window.location.reload(true), 10000);
    },

    items: [
	{
	    fieldLabel: gettext('Private Key (Optional)'),
	    labelAlign: 'top',
	    emptyText: gettext('No change'),
	    name: 'key',
	    xtype: 'textarea',
	},
	{
	    xtype: 'filebutton',
	    text: gettext('From File'),
	    listeners: {
		change: function(btn, e, value) {
		    let form = this.up('form');
		    e = e.event;
		    Ext.Array.each(e.target.files, function(file) {
			Proxmox.Utils.loadTextFromFile(
			    file,
			    function(res) {
				form.down('field[name=key]').setValue(res);
			    },
			    16384,
			);
		    });
		    btn.reset();
		},
	    },
	},
	{
	    xtype: 'box',
	    autoEl: 'hr',
	},
	{
	    fieldLabel: gettext('Certificate Chain'),
	    labelAlign: 'top',
	    allowBlank: false,
	    name: 'certificates',
	    xtype: 'textarea',
	},
	{
	    xtype: 'filebutton',
	    text: gettext('From File'),
	    listeners: {
		change: function(btn, e, value) {
		    let form = this.up('form');
		    e = e.event;
		    Ext.Array.each(e.target.files, function(file) {
			Proxmox.Utils.loadTextFromFile(
			    file,
			    function(res) {
				form.down('field[name=certificates]').setValue(res);
			    },
			    16384,
			);
		    });
		    btn.reset();
		},
	    },
	},
	{
	    xtype: 'hidden',
	    name: 'restart',
	    value: '1',
	},
	{
	    xtype: 'hidden',
	    name: 'force',
	    value: '1',
	},
    ],

    initComponent: function() {
	var me = this;

	if (!me.url) {
	    throw "neither url given";
	}

	me.callParent();
    },
});

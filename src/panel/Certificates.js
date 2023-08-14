Ext.define('Proxmox.panel.Certificates', {
    extend: 'Ext.grid.Panel',
    xtype: 'pmxCertificates',

    // array of { name, id (=filename), url, deletable, reloadUi }
    uploadButtons: undefined,

    // The /info path for the current node.
    infoUrl: undefined,

    columns: [
	{
	    header: gettext('File'),
	    width: 150,
	    dataIndex: 'filename',
	},
	{
	    header: gettext('Issuer'),
	    flex: 1,
	    dataIndex: 'issuer',
	},
	{
	    header: gettext('Subject'),
	    flex: 1,
	    dataIndex: 'subject',
	},
	{
	    header: gettext('Public Key Alogrithm'),
	    flex: 1,
	    dataIndex: 'public-key-type',
	    hidden: true,
	},
	{
	    header: gettext('Public Key Size'),
	    flex: 1,
	    dataIndex: 'public-key-bits',
	    hidden: true,
	},
	{
	    header: gettext('Valid Since'),
	    width: 150,
	    dataIndex: 'notbefore',
	    renderer: Proxmox.Utils.render_timestamp,
	},
	{
	    header: gettext('Expires'),
	    width: 150,
	    dataIndex: 'notafter',
	    renderer: Proxmox.Utils.render_timestamp,
	},
	{
	    header: gettext('Subject Alternative Names'),
	    flex: 1,
	    dataIndex: 'san',
	    renderer: Proxmox.Utils.render_san,
	},
	{
	    header: gettext('Fingerprint'),
	    dataIndex: 'fingerprint',
	    hidden: true,
	},
	{
	    header: gettext('PEM'),
	    dataIndex: 'pem',
	    hidden: true,
	},
    ],

    reload: function() {
	let me = this;
	me.rstore.load();
    },

    delete_certificate: function() {
	let me = this;

	let rec = me.selModel.getSelection()[0];
	if (!rec) {
	    return;
	}

	let cert = me.certById[rec.id];
	let url = cert.url;
	Proxmox.Utils.API2Request({
	    url: `/api2/extjs/${url}?restart=1`,
	    method: 'DELETE',
	    success: function(response, opt) {
		if (cert.reloadUi) {
		    Ext.getBody().mask(
			gettext('API server will be restarted to use new certificates, please reload web-interface!'),
			['pve-static-mask'],
		    );
		    // try to reload after 10 seconds automatically
		    Ext.defer(() => window.location.reload(true), 10000);
		}
	    },
	    failure: function(response, opt) {
		Ext.Msg.alert(gettext('Error'), response.htmlStatus);
	    },
	});
    },

    controller: {
	xclass: 'Ext.app.ViewController',
	view_certificate: function() {
	    let me = this;
	    let view = me.getView();

	    let selection = view.getSelection();
	    if (!selection || selection.length < 1) {
		return;
	    }
	    let win = Ext.create('Proxmox.window.CertificateViewer', {
		cert: selection[0].data.filename,
		url: `/api2/extjs/${view.infoUrl}`,
	    });
	    win.show();
	},
    },

    listeners: {
	itemdblclick: 'view_certificate',
    },

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    // only used for the store name
	    me.nodename = "_all";
	}

	if (!me.uploadButtons) {
	    throw "no upload buttons defined";
	}

	if (!me.infoUrl) {
	    throw "no certificate store url given";
	}

	me.rstore = Ext.create('Proxmox.data.UpdateStore', {
	    storeid: 'certs-' + me.nodename,
	    model: 'proxmox-certificate',
	    proxy: {
		type: 'proxmox',
		url: `/api2/extjs/${me.infoUrl}`,
	    },
	});

	me.store = {
	    type: 'diff',
	    rstore: me.rstore,
	};

	let tbar = [];

	me.deletableCertIds = {};
	me.certById = {};
	if (me.uploadButtons.length === 1) {
	    let cert = me.uploadButtons[0];

	    if (!cert.url) {
		throw "missing certificate url";
	    }

	    me.certById[cert.id] = cert;

	    if (cert.deletable) {
		me.deletableCertIds[cert.id] = true;
	    }

	    tbar.push(
		{
		    xtype: 'button',
		    text: gettext('Upload Custom Certificate'),
		    handler: function() {
			let grid = this.up('grid');
			let win = Ext.create('Proxmox.window.CertificateUpload', {
			    url: `/api2/extjs/${cert.url}`,
			    reloadUi: cert.reloadUi,
			});
			win.show();
			win.on('destroy', grid.reload, grid);
		    },
		},
	    );
	} else {
	    let items = [];

	    me.selModel = Ext.create('Ext.selection.RowModel', {});

	    for (const cert of me.uploadButtons) {
		if (!cert.id) {
		    throw "missing id in certificate entry";
		}

		if (!cert.url) {
		    throw "missing url in certificate entry";
		}

		if (!cert.name) {
		    throw "missing name in certificate entry";
		}

		me.certById[cert.id] = cert;

		if (cert.deletable) {
		    me.deletableCertIds[cert.id] = true;
		}

		items.push({
		    text: Ext.String.format('Upload {0} Certificate', cert.name),
		    handler: function() {
			let grid = this.up('grid');
			let win = Ext.create('Proxmox.window.CertificateUpload', {
			    url: `/api2/extjs/${cert.url}`,
			    reloadUi: cert.reloadUi,
			});
			win.show();
			win.on('destroy', grid.reload, grid);
		    },
		});
	    }

	    tbar.push(
		{
		    text: gettext('Upload Custom Certificate'),
		    menu: {
			xtype: 'menu',
			items,
		    },
		},
	    );
	}

	tbar.push(
	    {
		xtype: 'proxmoxButton',
		text: gettext('Delete Custom Certificate'),
		confirmMsg: rec => Ext.String.format(
		    gettext('Are you sure you want to remove the certificate used for {0}'),
		    me.certById[rec.id].name,
		),
		callback: () => me.reload(),
		selModel: me.selModel,
		disabled: true,
		enableFn: rec => !!me.deletableCertIds[rec.id],
		handler: function() { me.delete_certificate(); },
	    },
	    '-',
	    {
		xtype: 'proxmoxButton',
		itemId: 'viewbtn',
		disabled: true,
		text: gettext('View Certificate'),
		handler: 'view_certificate',
	    },
	);
	Ext.apply(me, { tbar });

	me.callParent();

	me.rstore.startUpdate();
	me.on('destroy', me.rstore.stopUpdate, me.rstore);
    },
});

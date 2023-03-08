Ext.define('Proxmox.window.PackageVersions', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxPackageVersions',

    title: gettext('Package versions'),
    width: 600,
    height: 650,
    layout: 'fit',
    modal: true,

    url: `/nodes/localhost/apt/versions`,

    viewModel: {
	parent: null,
	data: {
	    packageList: '',
	},
    },
    buttons: [
	{
	    xtype: 'button',
	    text: gettext('Copy'),
	    iconCls: 'fa fa-clipboard',
	    handler: function(button) {
		window.getSelection().selectAllChildren(
		    document.getElementById('pkgversions'),
		);
		document.execCommand("copy");
	    },
	},
	{
	    text: gettext('Ok'),
	    handler: function() {
		this.up('window').close();
	    },
	},
    ],
    items: [
	{
	    xtype: 'component',
	    autoScroll: true,
	    id: 'pkgversions',
	    padding: 5,
	    bind: {
		html: '{packageList}',
	    },
	    style: {
		'white-space': 'pre',
		'font-family': 'monospace',
	    },
	},
    ],
    listeners: {
	afterrender: function() {
	    this.loadPackageVersions(); // wait for after render so that we can show a load mask
	},
    },

    loadPackageVersions: async function() {
	let me = this;

	let { result } = await Proxmox.Async.api2({
	    waitMsgTarget: me.down('component[id="pkgversions"]'),
	    method: 'GET',
	    url: me.url,
	}).catch(Proxmox.Utils.alertResponseFailure); // FIXME: mask window instead?

	let text = '';
	for (const pkg of result.data) {
	    let version = "not correctly installed";
	    if (pkg.OldVersion && pkg.OldVersion !== 'unknown') {
		version = pkg.OldVersion;
	    } else if (pkg.CurrentState === 'ConfigFiles') {
		version = 'residual config';
	    }
	    const name = pkg.Package;
	    if (pkg.ExtraInfo) {
		text += `${name}: ${version} (${pkg.ExtraInfo})\n`;
	    } else {
		text += `${name}: ${version}\n`;
	    }
	}
	me.getViewModel().set('packageList', Ext.htmlEncode(text));
    },
});

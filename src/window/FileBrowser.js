Ext.define('proxmox-file-tree', {
    extend: 'Ext.data.Model',

    fields: ['filepath', 'text', 'type', 'size',
	{
	    name: 'mtime',
	    type: 'date',
	    dateFormat: 'timestamp',
	},
	{
	    name: 'iconCls',
	    calculate: function(data) {
		let icon = 'file-o';
		switch (data.type) {
		    case 'b': // block device
			icon = 'cube';
			break;
		    case 'c': // char device
			icon = 'tty';
			break;
		    case 'd':
			icon = data.expanded ? 'folder-open-o' : 'folder-o';
			break;
		    case 'f': //regular file
			icon = 'file-text-o';
			break;
		    case 'h': // hardlink
			icon = 'file-o';
			break;
		    case 'l': // softlink
			icon = 'link';
			break;
		    case 'p': // pipe/fifo
			icon = 'exchange';
			break;
		    case 's': // socket
			icon = 'plug';
			break;
		    case 'v': // virtual
			icon = 'cube';
			break;
		    default:
			icon = 'file-o';
			break;
		}

		return `fa fa-${icon}`;
	    },
	},
    ],
    idProperty: 'filepath',
});

Ext.define("Proxmox.window.FileBrowser", {
    extend: "Ext.window.Window",

    width: 800,
    height: 600,

    modal: true,

    config: {
	// the base-URL to get the list of files. required.
	listURL: '',

	// the base download URL, e.g., something like '/api2/...'
	downloadURL: '',

	// extra parameters set as proxy paramns and for an actual download request
	extraParams: {},

	// the file types for which the download button should be enabled
	downloadableFileTypes: {
	    'h': true, // hardlinks
	    'f': true, // "normal" files
	    'd': true, // directories
	},

	// set to true to show the tar download button
	enableTar: false,
    },

    controller: {
	xclass: 'Ext.app.ViewController',

	buildUrl: function(baseurl, params) {
	    let url = new URL(baseurl, window.location.origin);
	    for (const [key, value] of Object.entries(params)) {
		url.searchParams.append(key, value);
	    }

	    return url.href;
	},

	downloadTar: function() {
	    this.downloadFile(true);
	},

	downloadZip: function() {
	    this.downloadFile(false);
	},

	downloadFile: function(tar) {
	    let me = this;
	    let view = me.getView();
	    let tree = me.lookup('tree');
	    let selection = tree.getSelection();
	    if (!selection || selection.length < 1) return;

	    let data = selection[0].data;

	    let atag = document.createElement('a');

	    atag.download = data.text;
	    let params = { ...view.extraParams };
	    params.filepath = data.filepath;
	    atag.download = data.text;
	    if (data.type === 'd') {
		if (tar) {
		    params.tar = 1;
		    atag.download += ".tar.zst";
		} else {
		    atag.download += ".zip";
		}
	    }
	    atag.href = me.buildUrl(view.downloadURL, params);
	    atag.click();
	},

	fileChanged: function() {
	    let me = this;
	    let view = me.getView();
	    let tree = me.lookup('tree');
	    let selection = tree.getSelection();
	    if (!selection || selection.length < 1) return;

	    let data = selection[0].data;
	    let canDownload = view.downloadURL && view.downloadableFileTypes[data.type];
	    let zipBtn = me.lookup('downloadBtn');
	    let tarBtn = me.lookup('downloadTar');
	    zipBtn.setDisabled(!canDownload);
	    tarBtn.setDisabled(!canDownload);
	    zipBtn.setText(data.type === 'd' ? gettext('Download .zip') : gettext('Download'));
	    tarBtn.setVisible(data.type === 'd' && view.enableTar);
	},

	errorHandler: function(error, msg) {
	    let me = this;
	    if (error?.status === 503) {
		return false;
	    }
	    me.lookup('downloadBtn').setDisabled(true);
	    me.lookup('downloadTar').setDisabled(true);
	    if (me.initialLoadDone) {
		Ext.Msg.alert(gettext('Error'), msg);
		return true;
	    }
	    return false;
	},

	init: function(view) {
	    let me = this;
	    let tree = me.lookup('tree');

	    if (!view.listURL) {
		throw "no list URL given";
	    }

	    let store = tree.getStore();
	    let proxy = store.getProxy();

	    let errorCallback = (error, msg) => me.errorHandler(error, msg);
	    proxy.setUrl(view.listURL);
	    proxy.setTimeout(60*1000);
	    proxy.setExtraParams(view.extraParams);

	    tree.mon(store, 'beforeload', () => {
		Proxmox.Utils.setErrorMask(tree, true);
	    });
	    tree.mon(store, 'load', (treestore, rec, success, operation, node) => {
		if (success) {
		    Proxmox.Utils.setErrorMask(tree, false);
		    return;
		}
		if (!node.loadCount) {
		    node.loadCount = 0; // ensure its numeric
		}
		// trigger a reload if we got a 503 answer from the proxy
		if (operation?.error?.status === 503 && node.loadCount < 10) {
		    node.collapse();
		    node.expand();
		    node.loadCount++;
		    return;
		}

		let error = operation.getError();
		let msg = Proxmox.Utils.getResponseErrorMessage(error);
		if (!errorCallback(error, msg)) {
		    Proxmox.Utils.setErrorMask(tree, msg);
		} else {
		    Proxmox.Utils.setErrorMask(tree, false);
		}
	    });
	    store.load((rec, op, success) => {
		let root = store.getRoot();
		root.expand(); // always expand invisible root node
		if (view.archive === 'all') {
		    root.expandChildren(false);
		} else if (view.archive) {
		    let child = root.findChild('text', view.archive);
		    if (child) {
			child.expand();
			setTimeout(function() {
			    tree.setSelection(child);
			    tree.getView().focusRow(child);
			}, 10);
		    }
		} else if (root.childNodes.length === 1) {
		    root.firstChild.expand();
		}
		me.initialLoadDone = success;
	    });
	},

	control: {
	    'treepanel': {
		selectionchange: 'fileChanged',
	    },
	},
    },

    layout: 'fit',
    items: [
	{
	    xtype: 'treepanel',
	    scrollable: true,
	    rootVisible: false,
	    reference: 'tree',
	    store: {
		autoLoad: false,
		model: 'proxmox-file-tree',
		defaultRootId: '/',
		nodeParam: 'filepath',
		sorters: 'text',
		proxy: {
		    appendId: false,
		    type: 'proxmox',
		},
	    },

	    viewConfig: {
		loadMask: false,
	    },

	    columns: [
		{
		    text: gettext('Name'),
		    xtype: 'treecolumn',
		    flex: 1,
		    dataIndex: 'text',
		    renderer: Ext.String.htmlEncode,
		},
		{
		    text: gettext('Size'),
		    dataIndex: 'size',
		    renderer: value => value === undefined ? '' : Proxmox.Utils.format_size(value),
		    sorter: {
			sorterFn: function(a, b) {
			    let asize = a.data.size || 0;
			    let bsize = b.data.size || 0;

			    return asize - bsize;
			},
		    },
		},
		{
		    text: gettext('Modified'),
		    dataIndex: 'mtime',
		    minWidth: 200,
		},
		{
		    text: gettext('Type'),
		    dataIndex: 'type',
		    renderer: function(value) {
			switch (value) {
			    case 'b': return gettext('Block Device');
			    case 'c': return gettext('Character Device');
			    case 'd': return gettext('Directory');
			    case 'f': return gettext('File');
			    case 'h': return gettext('Hardlink');
			    case 'l': return gettext('Softlink');
			    case 'p': return gettext('Pipe/Fifo');
			    case 's': return gettext('Socket');
			    case 'v': return gettext('Virtual');
			    default: return Proxmox.Utils.unknownText;
			}
		    },
		},
	    ],
	},
    ],

    buttons: [
	{
	    text: gettext('Download .tar.zst'),
	    handler: 'downloadTar',
	    reference: 'downloadTar',
	    hidden: true,
	    disabled: true,
	},
	{
	    text: gettext('Download .zip'),
	    handler: 'downloadZip',
	    reference: 'downloadBtn',
	    disabled: true,
	},
    ],
});

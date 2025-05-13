Ext.define('proxmox-file-tree', {
    extend: 'Ext.data.Model',

    fields: [
        'filepath',
        'text',
        'type',
        'size',
        {
            name: 'sizedisplay',
            calculate: (data) => {
                if (data.size === undefined) {
                    return '';
                    // biome-ignore lint/correctness/noConstantCondition: temporarily disabled
                } else if (false && data.type === 'd') {
                    // eslint-disable-line no-constant-condition
                    // FIXME: enable again once we fixed trouble with confusing size vs item #
                    let fs = data.size === 1 ? gettext('{0} Item') : gettext('{0} Items');
                    return Ext.String.format(fs, data.size);
                }

                return Proxmox.Utils.format_size(data.size);
            },
        },
        {
            name: 'mtime',
            type: 'date',
            dateFormat: 'timestamp',
        },
        {
            name: 'iconCls',
            calculate: function (data) {
                let icon = Proxmox.Schema.pxarFileTypes[data.type]?.icon ?? 'file-o';
                if (data.expanded && data.type === 'd') {
                    icon = 'folder-open-o';
                }
                return `fa fa-${icon}`;
            },
        },
    ],
    idProperty: 'filepath',
});

Ext.define('Proxmox.window.FileBrowser', {
    extend: 'Ext.window.Window',

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
            h: true, // hardlinks
            f: true, // "normal" files
            d: true, // directories
        },

        // prefix to prepend to downloaded file names
        downloadPrefix: '',
    },

    controller: {
        xclass: 'Ext.app.ViewController',

        buildUrl: function (baseurl, params) {
            let url = new URL(baseurl, window.location.origin);
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value);
            }

            return url.href;
        },

        downloadTar: function () {
            this.downloadFile(true);
        },

        downloadZip: function () {
            this.downloadFile(false);
        },

        downloadFile: function (tar) {
            let me = this;
            let view = me.getView();
            let tree = me.lookup('tree');
            let selection = tree.getSelection();
            if (!selection || selection.length < 1) {
                return;
            }

            let data = selection[0].data;

            let params = { ...view.extraParams };
            params.filepath = data.filepath;

            let filename = view.downloadPrefix + data.text;
            if (data.type === 'd') {
                if (tar) {
                    params.tar = 1;
                    filename += '.tar.zst';
                } else {
                    filename += '.zip';
                }
            }

            Proxmox.Utils.downloadAsFile(me.buildUrl(view.downloadURL, params), filename);
        },

        fileChanged: function () {
            let me = this;
            let view = me.getView();
            let tree = me.lookup('tree');
            let selection = tree.getSelection();
            if (!selection || selection.length < 1) {
                return;
            }

            let data = selection[0].data;
            let st = Ext.String.format(gettext('Selected "{0}"'), atob(data.filepath));
            view.lookup('selectText').setText(st);

            let canDownload = view.downloadURL && view.downloadableFileTypes[data.type];
            let enableMenu = data.type === 'd';

            let downloadBtn = view.lookup('downloadBtn');
            downloadBtn.setDisabled(!canDownload || enableMenu);
            downloadBtn.setHidden(canDownload && enableMenu);
            let typeLabel =
                Proxmox.Schema.pxarFileTypes[data.type]?.label ?? Proxmox.Utils.unknownText;
            let ttip = Ext.String.format(
                gettext(
                    'File of type {0} cannot be downloaded directly, download a parent directory instead.',
                ),
                typeLabel,
            );
            if (!canDownload) {
                // ensure tooltip gets shown
                downloadBtn.setStyle({ pointerEvents: 'all' });
            }
            downloadBtn.setTooltip(canDownload ? null : ttip);

            let menuBtn = view.lookup('menuBtn');
            menuBtn.setDisabled(!canDownload || !enableMenu);
            menuBtn.setHidden(!canDownload || !enableMenu);
        },

        errorHandler: function (error, msg) {
            let me = this;
            if (error?.status === 503) {
                return false;
            }
            me.lookup('downloadBtn').setDisabled(true);
            me.lookup('menuBtn').setDisabled(true);
            if (me.initialLoadDone) {
                Ext.Msg.alert(gettext('Error'), msg);
                return true;
            }
            return false;
        },

        init: function (view) {
            let me = this;
            let tree = me.lookup('tree');

            if (!view.listURL) {
                throw 'no list URL given';
            }

            let store = tree.getStore();
            let proxy = store.getProxy();

            let errorCallback = (error, msg) => me.errorHandler(error, msg);
            proxy.setUrl(view.listURL);
            proxy.setTimeout(60 * 1000);
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
                        setTimeout(function () {
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
            treepanel: {
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
                    dataIndex: 'sizedisplay',
                    align: 'end',
                    sorter: {
                        sorterFn: function (a, b) {
                            if (a.data.type === 'd' && b.data.type !== 'd') {
                                return -1;
                            } else if (a.data.type !== 'd' && b.data.type === 'd') {
                                return 1;
                            }

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
                    renderer: (v) =>
                        Proxmox.Schema.pxarFileTypes[v]?.label ?? Proxmox.Utils.unknownText,
                },
            ],
        },
    ],

    fbar: [
        {
            text: '',
            xtype: 'label',
            reference: 'selectText',
        },
        {
            text: gettext('Download'),
            xtype: 'button',
            handler: 'downloadZip',
            reference: 'downloadBtn',
            disabled: true,
            hidden: true,
        },
        {
            text: gettext('Download as'),
            xtype: 'button',
            reference: 'menuBtn',
            menu: {
                items: [
                    {
                        iconCls: 'fa fa-fw fa-file-zip-o',
                        text: gettext('.zip'),
                        handler: 'downloadZip',
                        reference: 'downloadZip',
                    },
                    {
                        iconCls: 'fa fa-fw fa-archive',
                        text: gettext('.tar.zst'),
                        handler: 'downloadTar',
                        reference: 'downloadTar',
                    },
                ],
            },
        },
    ],
});

/*global apiSchema*/

Ext.onReady(function() {
    Ext.define('pmx-param-schema', {
        extend: 'Ext.data.Model',
        fields: [
	    'name', 'type', 'typetext', 'description', 'verbose_description',
	    'enum', 'minimum', 'maximum', 'minLength', 'maxLength',
	    'pattern', 'title', 'requires', 'format', 'default',
	    'disallow', 'extends', 'links',
	    {
		name: 'optional',
		type: 'boolean',
	    },
	],
    });

    let store = Ext.define('pmx-updated-treestore', {
	extend: 'Ext.data.TreeStore',
	model: Ext.define('pmx-api-doc', {
            extend: 'Ext.data.Model',
            fields: [
		'path', 'info', 'text',
	    ],
	}),
	proxy: {
	    type: 'memory',
	    data: apiSchema,
	},
	sorters: [{
	    property: 'leaf',
	    direction: 'ASC',
	}, {
	    property: 'text',
	    direction: 'ASC',
	}],
	filterer: 'bottomup',
	doFilter: function(node) {
	    this.filterNodes(node, this.getFilters().getFilterFn(), true);
	},

	filterNodes: function(node, filterFn, parentVisible) {
	    let me = this;

	    let match = filterFn(node) && (parentVisible || (node.isRoot() && !me.getRootVisible()));

	    if (node.childNodes && node.childNodes.length) {
		let bottomUpFiltering = me.filterer === 'bottomup';
		let childMatch;
		for (const child of node.childNodes) {
		    childMatch = me.filterNodes(child, filterFn, match || bottomUpFiltering) || childMatch;
		}
		if (bottomUpFiltering) {
		    match = childMatch || match;
		}
	    }

	    node.set("visible", match, me._silentOptions);
	    return match;
	},

    }).create();

    let render_description = function(value, metaData, record) {
	let pdef = record.data;

	value = pdef.verbose_description || value;

	// TODO: try to render asciidoc correctly

	metaData.style = 'white-space:pre-wrap;';

	return Ext.htmlEncode(value);
    };

    let render_type = function(value, metaData, record) {
	let pdef = record.data;

	return pdef.enum ? 'enum' : pdef.type || 'string';
    };

    let render_simple_format = function(pdef, type_fallback) {
	if (pdef.typetext) {
	    return pdef.typetext;
	}
	if (pdef.enum) {
	    return pdef.enum.join(' | ');
	}
	if (pdef.format) {
	    return pdef.format;
	}
	if (pdef.pattern) {
	    return pdef.pattern;
	}
	if (pdef.type === 'boolean') {
	    return `<true|false>`;
	}
	if (type_fallback && pdef.type) {
	    return `<${pdef.type}>`;
	}
	return '';
    };

    let render_format = function(value, metaData, record) {
	let pdef = record.data;

	metaData.style = 'white-space:normal;';

	if (pdef.type === 'array' && pdef.items) {
	    let format = render_simple_format(pdef.items, true);
	    return `[${Ext.htmlEncode(format)}, ...]`;
	}

	return Ext.htmlEncode(render_simple_format(pdef));
    };

    let real_path = function(path) {
	return path.replace(/^.*\/_upgrade_(\/)?/, "/");
    };

    let permission_text = function(permission) {
	let permhtml = "";

	if (permission.user) {
	    if (!permission.description) {
		if (permission.user === 'world') {
		    permhtml += "Accessible without any authentication.";
		} else if (permission.user === 'all') {
		    permhtml += "Accessible by all authenticated users.";
		} else {
		    permhtml += `Only accessible by user "${permission.user}"`;
		}
	    }
	} else if (permission.check) {
	    permhtml += `<pre>Check: ${Ext.htmlEncode(JSON.stringify(permission.check))}</pre>`;
	} else if (permission.userParam) {
	    permhtml += `<div>Check if user matches parameter '${permission.userParam}'`;
	} else if (permission.or) {
	    permhtml += "<div>Or<div style='padding-left: 10px;'>";
	    permhtml += permission.or.map(v => permission_text(v)).join('');
	    permhtml += "</div></div>";
	} else if (permission.and) {
	    permhtml += "<div>And<div style='padding-left: 10px;'>";
	    permhtml += permission.and.map(v => permission_text(v)).join('');
	    permhtml += "</div></div>";
	} else {
	    permhtml += "Unknown syntax!";
	}

	return permhtml;
    };

    let render_docu = function(data) {
	let md = data.info;

	let items = [];

	Ext.Array.each(['GET', 'POST', 'PUT', 'DELETE'], function(method) {
	    let info = md[method];
	    if (info) {
		let endpoint = real_path(data.path);
		let usage = `<table><tr><td>HTTP:&nbsp;&nbsp;&nbsp;</td><td>`;
		usage += `${method} /api2/json/${endpoint}</td></tr>`;

		if (typeof cliUsageRenderer === 'function') {
		    usage += cliUsageRenderer(method, endpoint); // eslint-disable-line no-undef
		}

		let sections = [
		    {
			title: 'Description',
			html: Ext.htmlEncode(info.description),
			bodyPadding: 10,
		    },
		    {
			title: 'Usage',
			html: usage,
			bodyPadding: 10,
		    },
		];

		if (info.parameters && info.parameters.properties) {
		    let pstore = Ext.create('Ext.data.Store', {
			model: 'pmx-param-schema',
			proxy: {
			    type: 'memory',
			},
			groupField: 'optional',
			sorters: [
			    {
				property: 'name',
				direction: 'ASC',
			    },
			],
		    });

		    Ext.Object.each(info.parameters.properties, function(name, pdef) {
			pdef.name = name;
			pstore.add(pdef);
		    });

		    pstore.sort();

		    let groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
			enableGroupingMenu: false,
			groupHeaderTpl: '<tpl if="groupValue">Optional</tpl><tpl if="!groupValue">Required</tpl>',
		    });

		    sections.push({
			xtype: 'gridpanel',
			title: 'Parameters',
			features: [groupingFeature],
			store: pstore,
			viewConfig: {
			    trackOver: false,
			    stripeRows: true,
			},
			columns: [
			    {
				header: 'Name',
				dataIndex: 'name',
				flex: 1,
			    },
			    {
				header: 'Type',
				dataIndex: 'type',
				renderer: render_type,
				flex: 1,
			    },
			    {
				header: 'Default',
				dataIndex: 'default',
				flex: 1,
			    },
			    {
				header: 'Format',
				dataIndex: 'type',
				renderer: render_format,
				flex: 2,
			    },
			    {
				header: 'Description',
				dataIndex: 'description',
				renderer: render_description,
				flex: 6,
			    },
			],
		    });
		}

		if (info.returns) {
		    let retinf = info.returns;
		    let rtype = retinf.type;
		    if (!rtype && retinf.items) {rtype = 'array';}
		    if (!rtype) {rtype = 'object';}

		    let rpstore = Ext.create('Ext.data.Store', {
			model: 'pmx-param-schema',
			proxy: {
			    type: 'memory',
			},
			groupField: 'optional',
			sorters: [
			    {
				property: 'name',
				direction: 'ASC',
			   },
			],
		    });

		    let properties;
		    if (rtype === 'array' && retinf.items.properties) {
			properties = retinf.items.properties;
		    }

		    if (rtype === 'object' && retinf.properties) {
			properties = retinf.properties;
		    }

		    Ext.Object.each(properties, function(name, pdef) {
			pdef.name = name;
			rpstore.add(pdef);
		    });

		    rpstore.sort();

		    let groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
			enableGroupingMenu: false,
			groupHeaderTpl: '<tpl if="groupValue">Optional</tpl><tpl if="!groupValue">Obligatory</tpl>',
		    });
		    let returnhtml;
		    if (retinf.items) {
			returnhtml = '<pre>items: ' + Ext.htmlEncode(JSON.stringify(retinf.items, null, 4)) + '</pre>';
		    }

		    if (retinf.properties) {
			returnhtml = returnhtml || '';
			returnhtml += '<pre>properties:' + Ext.htmlEncode(JSON.stringify(retinf.properties, null, 4)) + '</pre>';
		    }

		    let rawSection = Ext.create('Ext.panel.Panel', {
			bodyPadding: '0px 10px 10px 10px',
			html: returnhtml,
			hidden: true,
		    });

		    sections.push({
			xtype: 'gridpanel',
			title: 'Returns: ' + rtype,
			features: [groupingFeature],
			store: rpstore,
			viewConfig: {
			    trackOver: false,
			    stripeRows: true,
			},
			columns: [
			    {
				header: 'Name',
				dataIndex: 'name',
				flex: 1,
			    },
			    {
				header: 'Type',
				dataIndex: 'type',
				renderer: render_type,
				flex: 1,
			    },
			    {
				header: 'Default',
				dataIndex: 'default',
				flex: 1,
			    },
			    {
				header: 'Format',
				dataIndex: 'type',
				renderer: render_format,
				flex: 2,
			    },
			    {
				header: 'Description',
				dataIndex: 'description',
				renderer: render_description,
				flex: 6,
			    },
			],
			bbar: [
			    {
				xtype: 'button',
				text: 'Show RAW',
				handler: function(btn) {
				    rawSection.setVisible(!rawSection.isVisible());
				    btn.setText(rawSection.isVisible() ? 'Hide RAW' : 'Show RAW');
				},
			    },
			],
		    });

		    sections.push(rawSection);
		}

		if (!data.path.match(/\/_upgrade_/)) {
		    let permhtml = '';

		    if (!info.permissions) {
			permhtml = "Root only.";
		    } else {
			if (info.permissions.description) {
			    permhtml += "<div style='white-space:pre-wrap;padding-bottom:10px;'>" +
				Ext.htmlEncode(info.permissions.description) + "</div>";
			}
			permhtml += permission_text(info.permissions);
		    }

		    if (info.allowtoken !== undefined && !info.allowtoken) {
		        permhtml += "<br />This API endpoint is not available for API tokens.";
		    }

		    sections.push({
			title: 'Required permissions',
			bodyPadding: 10,
			html: permhtml,
		    });
		}

		items.push({
		    title: method,
		    autoScroll: true,
		    defaults: {
			border: false,
		    },
		    items: sections,
		});
	    }
	});

	let ct = Ext.getCmp('docview');
	ct.setTitle("Path: " + real_path(data.path));
	ct.removeAll(true);
	ct.add(items);
	ct.setActiveTab(0);
    };

    Ext.define('Ext.form.SearchField', {
	extend: 'Ext.form.field.Text',
	alias: 'widget.searchfield',

	emptyText: 'Search...',

	flex: 1,

	inputType: 'search',
	listeners: {
	    'change': function() {
		let value = this.getValue();
		if (!Ext.isEmpty(value)) {
		    store.filter({
			property: 'path',
			value: value,
			anyMatch: true,
		    });
		} else {
		    store.clearFilter();
		}
	    },
	},
    });

    let treePanel = Ext.create('Ext.tree.Panel', {
	title: 'Resource Tree',
	tbar: [
	    {
		xtype: 'searchfield',
	    },
	],
	tools: [
	    {
		type: 'expand',
		tooltip: 'Expand all',
		tooltipType: 'title',
		callback: tree => tree.expandAll(),
	    },
	    {
		type: 'collapse',
		tooltip: 'Collapse all',
		tooltipType: 'title',
		callback: tree => tree.collapseAll(),
	    },
	],
        store: store,
	width: 200,
        region: 'west',
        split: true,
        margins: '5 0 5 5',
        rootVisible: false,
	listeners: {
	    selectionchange: function(v, selections) {
		if (!selections[0]) {return;}
		let rec = selections[0];
		render_docu(rec.data);
		location.hash = '#' + rec.data.path;
	    },
	},
    });

    Ext.create('Ext.container.Viewport', {
	layout: 'border',
	renderTo: Ext.getBody(),
	items: [
	    treePanel,
	    {
		xtype: 'tabpanel',
		title: 'Documentation',
		id: 'docview',
		region: 'center',
		margins: '5 5 5 0',
		layout: 'fit',
		items: [],
	    },
	],
    });

    let deepLink = function() {
	let path = window.location.hash.substring(1).replace(/\/\s*$/, '');
	let endpoint = store.findNode('path', path);

	if (endpoint) {
	    treePanel.getSelectionModel().select(endpoint);
	    treePanel.expandPath(endpoint.getPath());
	    render_docu(endpoint.data);
	}
    };
    window.onhashchange = deepLink;

    deepLink();
});

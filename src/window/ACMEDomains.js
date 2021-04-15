Ext.define('Proxmox.window.ACMEDomainEdit', {
    extend: 'Proxmox.window.Edit',
    xtype: 'pmxACMEDomainEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    subject: gettext('Domain'),
    isCreate: false,
    width: 450,
    //onlineHelp: 'sysadmin_certificate_management',

    acmeUrl: undefined,

    // config url
    url: undefined,

    // For PMG the we have multiple certificates, so we have a "usage" attribute & column.
    domainUsages: undefined,

    // Force the use of 'acmedomainX' properties.
    separateDomainEntries: undefined,

    cbindData: function(config) {
	let me = this;
	return {
	    pluginsUrl: `/api2/json/${me.acmeUrl}/plugins`,
	    hasUsage: !!me.domainUsages,
	};
    },

    items: [
	{
	    xtype: 'inputpanel',
	    onGetValues: function(values) {
		let me = this;
		let win = me.up('pmxACMEDomainEdit');
		let nodeconfig = win.nodeconfig;
		let olddomain = win.domain || {};

		let params = {
		    digest: nodeconfig.digest,
		};

		let configkey = olddomain.configkey;
		let acmeObj = Proxmox.Utils.parseACME(nodeconfig.acme);

		let find_free_slot = () => {
		    for (let i = 0; i < Proxmox.Utils.acmedomain_count; i++) {
			if (nodeconfig[`acmedomain${i}`] === undefined) {
			    return `acmedomain${i}`;
			}
		    }
		    throw "too many domains configured";
		};

		// If we have a 'usage' property (pmg), we only use the `acmedomainX` config keys.
		if (win.separateDomainEntries || win.domainUsages) {
		    if (!configkey || configkey === 'acme') {
			configkey = find_free_slot();
		    }
		    delete values.type;
		    params[configkey] = Proxmox.Utils.printPropertyString(values, 'domain');
		    return params;
		}

		// Otherwise we put the standalone entries into the `domains` list of the `acme`
		// property string.

		// Then insert the domain depending on its type:
		if (values.type === 'dns') {
		    if (!olddomain.configkey || olddomain.configkey === 'acme') {
			configkey = find_free_slot();
			if (olddomain.domain) {
			    // we have to remove the domain from the acme domainlist
			    Proxmox.Utils.remove_domain_from_acme(acmeObj, olddomain.domain);
			    params.acme = Proxmox.Utils.printACME(acmeObj);
			}
		    }

		    delete values.type;
		    params[configkey] = Proxmox.Utils.printPropertyString(values, 'domain');
		} else {
		    if (olddomain.configkey && olddomain.configkey !== 'acme') {
			// delete the old dns entry, unless we need to declare its usage:
			params.delete = [olddomain.configkey];
		    }

		    // add new, remove old and make entries unique
		    Proxmox.Utils.add_domain_to_acme(acmeObj, values.domain);
		    if (olddomain.domain !== values.domain) {
			Proxmox.Utils.remove_domain_from_acme(acmeObj, olddomain.domain);
		    }
		    params.acme = Proxmox.Utils.printACME(acmeObj);
		}

		return params;
	    },
	    items: [
		{
		    xtype: 'proxmoxKVComboBox',
		    name: 'type',
		    fieldLabel: gettext('Challenge Type'),
		    allowBlank: false,
		    value: 'standalone',
		    comboItems: [
			['standalone', 'HTTP'],
			['dns', 'DNS'],
		    ],
		    validator: function(value) {
			let me = this;
			let win = me.up('pmxACMEDomainEdit');
			let oldconfigkey = win.domain ? win.domain.configkey : undefined;
			let val = me.getValue();
			if (val === 'dns' && (!oldconfigkey || oldconfigkey === 'acme')) {
			    // we have to check if there is a 'acmedomain' slot left
			    let found = false;
			    for (let i = 0; i < Proxmox.Utils.acmedomain_count; i++) {
				if (!win.nodeconfig[`acmedomain${i}`]) {
				    found = true;
				}
			    }
			    if (!found) {
				return gettext('Only 5 Domains with type DNS can be configured');
			    }
			}

			return true;
		    },
		    listeners: {
			change: function(cb, value) {
			    let me = this;
			    let view = me.up('pmxACMEDomainEdit');
			    let pluginField = view.down('field[name=plugin]');
			    pluginField.setDisabled(value !== 'dns');
			    pluginField.setHidden(value !== 'dns');
			},
		    },
		},
		{
		    xtype: 'hidden',
		    name: 'alias',
		},
		{
		    xtype: 'pmxACMEPluginSelector',
		    name: 'plugin',
		    disabled: true,
		    hidden: true,
		    allowBlank: false,
		    cbind: {
			url: '{pluginsUrl}',
		    },
		},
		{
		    xtype: 'proxmoxtextfield',
		    name: 'domain',
		    allowBlank: false,
		    vtype: 'DnsNameOrWildcard',
		    value: '',
		    fieldLabel: gettext('Domain'),
		},
		{
		    xtype: 'combobox',
		    name: 'usage',
		    multiSelect: true,
		    editable: false,
		    fieldLabel: gettext('Usage'),
		    cbind: {
			hidden: '{!hasUsage}',
			allowBlank: '{!hasUsage}',
		    },
		    fields: ['usage', 'name'],
		    displayField: 'name',
		    valueField: 'usage',
		    store: {
			data: [
			    { usage: 'api', name: 'API' },
			    { usage: 'smtp', name: 'SMTP' },
			],
		    },
		},
	    ],
	},
    ],

    initComponent: function() {
	let me = this;

	if (!me.url) {
	    throw 'no url given';
	}

	if (!me.acmeUrl) {
	    throw 'no acmeUrl given';
	}

	if (!me.nodeconfig) {
	    throw 'no nodeconfig given';
	}

	me.isCreate = !me.domain;
	if (me.isCreate) {
	    me.domain = `${Proxmox.NodeName}.`; // TODO: FQDN of node
	}

	me.callParent();

	if (!me.isCreate) {
	    let values = { ...me.domain };
	    if (Ext.isDefined(values.usage)) {
		values.usage = values.usage.split(';');
	    }
	    me.setValues(values);
	} else {
	    me.setValues({ domain: me.domain });
	}
    },
});

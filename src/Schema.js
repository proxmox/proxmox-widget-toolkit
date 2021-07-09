Ext.define('Proxmox.Schema', { // a singleton
    singleton: true,

    authDomains: {
	pam: {
	    name: 'Linux PAM',
	    add: false,
	    edit: false,
	    pwchange: true,
	},
	openid: {
	    name: gettext('OpenID Connect Server'),
	    ipanel: 'pmxAuthOpenIDPanel',
	    add: true,
	    edit: true,
	    tfa: false,
	    pwchange: false,
	    iconCls: 'pmx-itype-icon-openid-logo',
	},
    },
    // to add or change existing for product specific ones
    overrideAuthDomains: function(extra) {
	for (const [key, value] of Object.entries(extra)) {
	    Proxmox.Schema.authDomains[key] = value;
	}
    },
});

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
	ldap: {
	    name: gettext('LDAP Server'),
	    ipanel: 'pmxAuthLDAPPanel',
	    add: true,
	    edit: true,
	    tfa: true,
	    pwchange: false,
	},
    },
    // to add or change existing for product specific ones
    overrideAuthDomains: function(extra) {
	for (const [key, value] of Object.entries(extra)) {
	    Proxmox.Schema.authDomains[key] = value;
	}
    },

    pxarFileTypes: {
	b: { icon: 'cube', label: gettext('Block Device') },
	c: { icon: 'tty', label: gettext('Character Device') },
	d: { icon: 'folder-o', label: gettext('Directory') },
	f: { icon: 'file-text-o', label: gettext('File') },
	h: { icon: 'file-o', label: gettext('Hardlink') },
	l: { icon: 'link', label: gettext('Softlink') },
	p: { icon: 'exchange', label: gettext('Pipe/Fifo') },
	s: { icon: 'plug', label: gettext('Socket') },
	v: { icon: 'cube', label: gettext('Virtual') },
    },
});

Ext.define('Proxmox.Schema', { // a singleton
    singleton: true,

    authDomains: {
	pam: {
	    name: 'Linux PAM',
	    add: false,
	    edit: false,
	    pwchange: true,
	    sync: false,
	    useTypeInUrl: false,
	},
	openid: {
	    name: gettext('OpenID Connect Server'),
	    ipanel: 'pmxAuthOpenIDPanel',
	    add: true,
	    edit: true,
	    tfa: false,
	    pwchange: false,
	    sync: false,
	    iconCls: 'pmx-itype-icon-openid-logo',
	    useTypeInUrl: true,
	},
	ldap: {
	    name: gettext('LDAP Server'),
	    ipanel: 'pmxAuthLDAPPanel',
	    syncipanel: 'pmxAuthLDAPSyncPanel',
	    add: true,
	    edit: true,
	    tfa: true,
	    pwchange: false,
	    sync: true,
	    useTypeInUrl: true,
	},
	ad: {
	    name: gettext('Active Directory Server'),
	    ipanel: 'pmxAuthADPanel',
	    syncipanel: 'pmxAuthADSyncPanel',
	    add: true,
	    edit: true,
	    tfa: true,
	    pwchange: false,
	    sync: true,
	    useTypeInUrl: true,
	},
    },
    // to add or change existing for product specific ones
    overrideAuthDomains: function(extra) {
	for (const [key, value] of Object.entries(extra)) {
	    Proxmox.Schema.authDomains[key] = value;
	}
    },

    notificationEndpointTypes: {
	sendmail: {
	    name: 'Sendmail',
	    ipanel: 'pmxSendmailEditPanel',
	    iconCls: 'fa-envelope-o',
	    defaultMailAuthor: 'Proxmox VE',
	},
	smtp: {
	    name: 'SMTP',
	    ipanel: 'pmxSmtpEditPanel',
	    iconCls: 'fa-envelope-o',
	    defaultMailAuthor: 'Proxmox VE',
	},
	gotify: {
	    name: 'Gotify',
	    ipanel: 'pmxGotifyEditPanel',
	    iconCls: 'fa-bell-o',
	},
	webhook: {
	    name: 'Webhook',
	    ipanel: 'pmxWebhookEditPanel',
	    iconCls: 'fa-bell-o',
	},
    },

    // to add or change existing for product specific ones
    overrideEndpointTypes: function(extra) {
	for (const [key, value] of Object.entries(extra)) {
	    Proxmox.Schema.notificationEndpointTypes[key] = value;
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

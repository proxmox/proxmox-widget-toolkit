// not realy a panel descendant, but its the best (existing) place for this
Ext.define('Proxmox.EOLNotice', {
    extend: 'Ext.Component',
    alias: 'widget.proxmoxEOLNotice',

    padding: '0 5',

    config: {
	product: '',
	version: '',
	eolDate: '',
	href: '',
    },

    autoEl: {
	tag: 'div',
	'data-qtip': gettext("You won't get any security fixes after the End-Of-Life date. Please consider upgrading."),
    },

    initComponent: function() {
	let me = this;

	let href = me.href.startsWith('http') ? me.href : `https://${me.href}`;
	let message = Ext.String.format(
	    gettext('Support for {0} {1} ends on {2}'), me.product, me.version, me.eolDate);

	me.html = `<i class="fa pwt-eol-icon fa-exclamation-triangle"></i>
	    <a href="${href}" target="_blank">${message} <i class="fa fa-external-link"></i></a>
	`;

	me.callParent();
    },
});

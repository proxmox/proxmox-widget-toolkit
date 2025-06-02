// not realy a panel descendant, but its the best (existing) place for this
Ext.define('Proxmox.EOLNotice', {
    extend: 'Ext.Component',
    alias: 'widget.proxmoxEOLNotice',

    userCls: 'eol-notice',
    padding: '0 5',

    config: {
        product: '',
        version: '',
        eolDate: '',
        href: '',
    },

    autoEl: {
        tag: 'div',
        'data-qtip': gettext(
            "You won't get any security fixes after the End-Of-Life date. Please consider upgrading.",
        ),
    },

    getIconCls: function () {
        let me = this;

        const now = new Date();
        const eolDate = new Date(me.eolDate);
        const warningCutoff = new Date(eolDate.getTime() - 21 * 24 * 60 * 60 * 1000); // 3 weeks

        return now > warningCutoff
            ? 'critical fa-exclamation-triangle'
            : 'info-blue fa-info-circle';
    },

    initComponent: function () {
        let me = this;

        let iconCls = me.getIconCls();
        let href = me.href.startsWith('http') ? me.href : `https://${me.href}`;
        let message = Ext.String.format(
            gettext('Support for {0} {1} ends on {2}'),
            me.product,
            me.version,
            me.eolDate,
        );

        me.html = `<i class="fa ${iconCls}"></i>
	    <a href="${href}" target="_blank">${message} <i class="fa fa-external-link"></i></a>
	`;

        me.callParent();
    },
});

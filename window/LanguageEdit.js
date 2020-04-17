Ext.define('Proxmox.window.LanguageEditWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.pmxLanguageEditWindow',

    cookieName: 'PVELangCookie',

    title: gettext('Language'),
    modal: true,
    bodyPadding: 10,
    items: [
	{
	    xtype: 'proxmoxLanguageSelector',
	    fieldLabel: gettext('Language'),
	},
    ],

    buttons: [
	{
	    text: gettext('OK'),
	    handler: function() {
		let me = this;
		let win = this.up('window');
		let value = win.down('proxmoxLanguageSelector').getValue();
		let dt = Ext.Date.add(new Date(), Ext.Date.YEAR, 10);
		Ext.util.Cookies.set(win.cookieName, value, dt);
		win.mask(gettext('Please wait...'), 'x-mask-loading');
		window.location.reload();
	    }
	},
    ],

    initComponent: function() {
	let me = this;

	if (!me.cookieName) {
	    throw "no cookie name given";
	}

	me.callParent();
	me.down('proxmoxLanguageSelector')
	    .setValue(Ext.util.Cookies.get(me.cookieName) || '__default__');
    },
});

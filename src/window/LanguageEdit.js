Ext.define('Proxmox.window.LanguageEditWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.pmxLanguageEditWindow',

    viewModel: {
	parent: null,
	data: {
	    language: '__default__',
	},
    },
    controller: {
	xclass: 'Ext.app.ViewController',
	init: function(view) {
	    let language = Ext.util.Cookies.get(view.cookieName) || '__default__';
	    this.getViewModel().set('language', language);
	},
	applyLanguage: function(button) {
	    let view = this.getView();
	    let vm = this.getViewModel();

	    let expire = Ext.Date.add(new Date(), Ext.Date.YEAR, 10);
	    Ext.util.Cookies.set(view.cookieName, vm.get('language'), expire);
	    view.mask(gettext('Please wait...'), 'x-mask-loading');
	    window.location.reload();
	},
    },

    cookieName: 'PVELangCookie',

    title: gettext('Language'),
    modal: true,
    bodyPadding: 10,
    resizable: false,
    items: [
	{
	    xtype: 'proxmoxLanguageSelector',
	    fieldLabel: gettext('Language'),
	    labelWidth: 75,
	    bind: {
		value: '{language}',
	    },
	},
    ],
    buttons: [
	{
	    text: gettext('Apply'),
	    handler: 'applyLanguage',
	},
    ],
});

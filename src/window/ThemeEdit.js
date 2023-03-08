Ext.define('Proxmox.window.ThemeEditWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.pmxThemeEditWindow',

    viewModel: {
	parent: null,
	data: {
	    language: '__default__',
	},
    },
    controller: {
	xclass: 'Ext.app.ViewController',
	init: function(view) {
	    let theme = Ext.util.Cookies.get(view.cookieName) || '__default__';
	    this.getViewModel().set('theme', theme);
	},
	applyTheme: function(button) {
	    let view = this.getView();
	    let vm = this.getViewModel();

	    let expire = Ext.Date.add(new Date(), Ext.Date.YEAR, 10);
	    Ext.util.Cookies.set(view.cookieName, vm.get('theme'), expire);
	    view.mask(gettext('Please wait...'), 'x-mask-loading');
	    window.location.reload();
	},
    },

    cookieName: 'PVEThemeCookie',

    title: gettext('Theme'),
    modal: true,
    bodyPadding: 10,
    resizable: false,
    items: [
	{
	    xtype: 'proxmoxThemeSelector',
	    fieldLabel: gettext('Theme'),
	    bind: {
		value: '{theme}',
	    },
	},
    ],
    buttons: [
	{
	    text: gettext('Apply'),
	    handler: 'applyTheme',
	},
    ],
});

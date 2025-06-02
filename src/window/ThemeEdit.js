Ext.define('Proxmox.window.ThemeEditWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.pmxThemeEditWindow',

    viewModel: {
        parent: null,
        data: {},
    },
    controller: {
        xclass: 'Ext.app.ViewController',
        init: function (view) {
            let theme = '__default__';

            let savedTheme = Ext.util.Cookies.get(view.cookieName);
            if (savedTheme && savedTheme in Proxmox.Utils.theme_map) {
                theme = savedTheme;
            }
            this.getViewModel().set('theme', theme);
        },
        applyTheme: function (button) {
            let view = this.getView();
            let vm = this.getViewModel();

            let expire = Ext.Date.add(new Date(), Ext.Date.YEAR, 10);
            Ext.util.Cookies.set(view.cookieName, vm.get('theme'), expire);
            view.mask(gettext('Please wait...'), 'x-mask-loading');
            window.location.reload();
        },
    },

    cookieName: 'PVEThemeCookie',

    title: gettext('Color Theme'),
    modal: true,
    bodyPadding: 10,
    resizable: false,
    items: [
        {
            xtype: 'proxmoxThemeSelector',
            fieldLabel: gettext('Color Theme'),
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

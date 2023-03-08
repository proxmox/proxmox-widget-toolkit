Ext.define('Proxmox.form.ThemeSelector', {
    extend: 'Proxmox.form.KVComboBox',
    xtype: 'proxmoxThemeSelector',

    comboItems: Proxmox.Utils.theme_array(),
});

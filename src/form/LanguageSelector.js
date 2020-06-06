Ext.define('Proxmox.form.LanguageSelector', {
    extend: 'Proxmox.form.KVComboBox',
    xtype: 'proxmoxLanguageSelector',

    comboItems: Proxmox.Utils.language_array(),
});

Ext.define('Proxmox.form.field.FingerprintField', {
    extend: 'Proxmox.form.field.Textfield',
    alias: ['widget.pmxFingerprintField'],

    config: {
	fieldLabel: gettext('Fingerprint'),
	emptyText: gettext('Server certificate SHA-256 fingerprint, required for self-signed certificates'),

	regex: /[A-Fa-f0-9]{2}(:[A-Fa-f0-9]{2}){31}/,
	regexText: gettext('Example') + ': AB:CD:EF:...',

	allowBlank: true,
    },
});

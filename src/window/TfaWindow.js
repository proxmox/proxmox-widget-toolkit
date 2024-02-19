/*global u2f*/
Ext.define('Proxmox.window.TfaLoginWindow', {
    extend: 'Ext.window.Window',
    mixins: ['Proxmox.Mixin.CBind'],

    title: gettext("Second login factor required"),

    modal: true,
    resizable: false,
    width: 512,
    layout: {
	type: 'vbox',
	align: 'stretch',
    },

    defaultButton: 'tfaButton',

    viewModel: {
	data: {
	    confirmText: gettext('Confirm Second Factor'),
	    canConfirm: false,
	    availableChallenge: {},
	},
    },

    cancelled: true,

    controller: {
	xclass: 'Ext.app.ViewController',

	init: function(view) {
	    let me = this;
	    let vm = me.getViewModel();

	    if (!view.userid) {
		throw "no userid given";
	    }
	    if (!view.ticket) {
		throw "no ticket given";
	    }
	    const challenge = view.challenge;
	    if (!challenge) {
		throw "no challenge given";
	    }

	    let lastTabId = me.getLastTabUsed();
	    let initialTab = -1, i = 0;
	    let count2nd = 0;
	    let hasRecovery = false;
	    for (const k of ['webauthn', 'totp', 'recovery', 'u2f', 'yubico']) {
		const available = !!challenge[k];
		vm.set(`availableChallenge.${k}`, available);

		if (available) {
		    count2nd++;
		    if (k === 'recovery') {
			hasRecovery = true;
		    }
		    if (i === lastTabId) {
			initialTab = i;
		    } else if (initialTab < 0) {
			initialTab = i;
		    }
		}
		i++;
	    }
	    if (!count2nd || (count2nd === 1 && hasRecovery && !challenge.recovery.length)) {
		// no 2nd factors available (and if recovery keys are configured they're empty)
		me.lookup('cannotLogin').setVisible(true);
		me.lookup('recoveryKey').setVisible(false);
		view.down('tabpanel').setActiveTab(2); // recovery
		return;
	    }
	    view.down('tabpanel').setActiveTab(initialTab);

	    if (challenge.recovery) {
		if (!view.challenge.recovery.length) {
		    me.lookup('recoveryEmpty').setVisible(true);
		    me.lookup('recoveryKey').setVisible(false);
		} else {
		    let idList = view
			    .challenge
			    .recovery
			    .map((id) => Ext.String.format(gettext('ID {0}'), id))
			    .join(', ');
		    me.lookup('availableRecovery').update(Ext.String.htmlEncode(
			Ext.String.format(gettext('Available recovery keys: {0}'), idList),
		    ));
		    me.lookup('availableRecovery').setVisible(true);
		    if (view.challenge.recovery.length <= 3) {
			me.lookup('recoveryLow').setVisible(true);
		    }
		}
	    }

	    if (challenge.webauthn && initialTab === 0) {
		let _promise = me.loginWebauthn();
	    } else if (challenge.u2f && initialTab === 3) {
		let _promise = me.loginU2F();
	    }
	},
	control: {
	    'tabpanel': {
		tabchange: function(tabPanel, newCard, oldCard) {
		    // for now every TFA method has at max one field, so keep it simple..
		    let oldField = oldCard.down('field');
		    if (oldField) {
			oldField.setDisabled(true);
		    }
		    let newField = newCard.down('field');
		    if (newField) {
			newField.setDisabled(false);
			newField.focus();
			newField.validate();
		    }

		    let confirmText = newCard.confirmText || gettext('Confirm Second Factor');
		    this.getViewModel().set('confirmText', confirmText);

		    this.saveLastTabUsed(tabPanel, newCard);
		},
	    },
	    'field': {
		validitychange: function(field, valid) {
		    // triggers only for enabled fields and we disable the one from the
		    // non-visible tab, so we can just directly use the valid param
		    this.getViewModel().set('canConfirm', valid);
		},
		afterrender: field => field.focus(), // ensure focus after initial render
	    },
	},

	saveLastTabUsed: function(tabPanel, card) {
	    let id = tabPanel.items.indexOf(card);
	    window.localStorage.setItem('Proxmox.TFALogin.lastTab', JSON.stringify({ id }));
	},

	getLastTabUsed: function() {
	    let data = window.localStorage.getItem('Proxmox.TFALogin.lastTab');
	    if (typeof data === 'string') {
		let last = JSON.parse(data);
		return last.id;
	    }
	    return null;
	},

	onClose: function() {
	    let me = this;
	    let view = me.getView();

	    if (!view.cancelled) {
		return;
	    }

	    view.onReject();
	},

	cancel: function() {
	    this.getView().close();
	},

	loginTotp: function() {
	    let me = this;

	    let code = me.lookup('totp').getValue();
	    let _promise = me.finishChallenge(`totp:${code}`);
	},

	loginYubico: function() {
	    let me = this;

	    let code = me.lookup('yubico').getValue();
	    let _promise = me.finishChallenge(`yubico:${code}`);
	},

	loginWebauthn: async function() {
	    let me = this;
	    let view = me.getView();

	    me.lookup('webAuthnWaiting').setVisible(true);
	    me.lookup('webAuthnError').setVisible(false);

	    let challenge = view.challenge.webauthn;

	    if (typeof challenge.string !== 'string') {
		// Byte array fixup, keep challenge string:
		challenge.string = challenge.publicKey.challenge;
		challenge.publicKey.challenge = Proxmox.Utils.base64url_to_bytes(challenge.string);
		for (const cred of challenge.publicKey.allowCredentials) {
		    cred.id = Proxmox.Utils.base64url_to_bytes(cred.id);
		}
	    }

	    let controller = new AbortController();
	    challenge.signal = controller.signal;

	    let hwrsp;
	    try {
		//Promise.race( ...
		hwrsp = await navigator.credentials.get(challenge);
	    } catch (error) {
		// we do NOT want to fail login because of canceling the challenge actively,
		// in some browser that's the only way to switch over to another method as the
		// disallow user input during the time the challenge is active
		// checking for error.code === DOMException.ABORT_ERR only works in firefox -.-
		this.getViewModel().set('canConfirm', true);
		// FIXME: better handling, show some message, ...?
		me.lookup('webAuthnError').setData({
		    error: Ext.htmlEncode(error.toString()),
		});
		me.lookup('webAuthnError').setVisible(true);
		return;
	    } finally {
		let waitingMessage = me.lookup('webAuthnWaiting');
		if (waitingMessage) {
		    waitingMessage.setVisible(false);
		}
	    }

	    let response = {
		id: hwrsp.id,
		type: hwrsp.type,
		challenge: challenge.string,
		rawId: Proxmox.Utils.bytes_to_base64url(hwrsp.rawId),
		response: {
		    authenticatorData: Proxmox.Utils.bytes_to_base64url(
			hwrsp.response.authenticatorData,
		    ),
		    clientDataJSON: Proxmox.Utils.bytes_to_base64url(hwrsp.response.clientDataJSON),
		    signature: Proxmox.Utils.bytes_to_base64url(hwrsp.response.signature),
		},
	    };

	    await me.finishChallenge("webauthn:" + JSON.stringify(response));
	},

	loginU2F: async function() {
	    let me = this;
	    let view = me.getView();

	    me.lookup('u2fWaiting').setVisible(true);
	    me.lookup('u2fError').setVisible(false);

	    let hwrsp;
	    try {
		hwrsp = await new Promise((resolve, reject) => {
		    try {
			let data = view.challenge.u2f;
			let chlg = data.challenge;
			u2f.sign(chlg.appId, chlg.challenge, data.keys, resolve);
		    } catch (error) {
			reject(error);
		    }
		});
		if (hwrsp.errorCode) {
		    throw Proxmox.Utils.render_u2f_error(hwrsp.errorCode);
		}
		delete hwrsp.errorCode;
	    } catch (error) {
		this.getViewModel().set('canConfirm', true);
		me.lookup('u2fError').setData({
		    error: Ext.htmlEncode(error.toString()),
		});
		me.lookup('u2fError').setVisible(true);
		return;
	    } finally {
		let waitingMessage = me.lookup('u2fWaiting');
		if (waitingMessage) {
		    waitingMessage.setVisible(false);
		}
	    }

	    await me.finishChallenge("u2f:" + JSON.stringify(hwrsp));
	},

	loginRecovery: function() {
	    let me = this;

	    let key = me.lookup('recoveryKey').getValue();
	    let _promise = me.finishChallenge(`recovery:${key}`);
	},

	loginTFA: function() {
	    let me = this;
	    // avoid triggering more than once during challenge
	    me.getViewModel().set('canConfirm', false);
	    let view = me.getView();
	    let tfaPanel = view.down('tabpanel').getActiveTab();
	    me[tfaPanel.handler]();
	},

	finishChallenge: function(password) {
	    let me = this;
	    let view = me.getView();
	    view.cancelled = false;

	    let params = {
		username: view.userid,
		'tfa-challenge': view.ticket,
		password,
	    };

	    let resolve = view.onResolve;
	    let reject = view.onReject;
	    view.close();

	    return Proxmox.Async.api2({
		url: '/api2/extjs/access/ticket',
		method: 'POST',
		params,
	    })
	    .then(resolve)
	    .catch(reject);
	},
    },

    listeners: {
	close: 'onClose',
    },

    items: [{
	xtype: 'tabpanel',
	region: 'center',
	layout: 'fit',
	bodyPadding: 10,
	items: [
	    {
		xtype: 'panel',
		title: 'WebAuthn',
		iconCls: 'fa fa-fw fa-shield',
		confirmText: gettext('Start WebAuthn challenge'),
		handler: 'loginWebauthn',
		bind: {
		    disabled: '{!availableChallenge.webauthn}',
		},
		items: [
		    {
			xtype: 'box',
			html: gettext('Please insert your authentication device and press its button'),
		    },
		    {
			xtype: 'box',
			html: gettext('Waiting for second factor.') +`<i class="fa fa-refresh fa-spin fa-fw"></i>`,
			reference: 'webAuthnWaiting',
			hidden: true,
		    },
		    {
			xtype: 'box',
			data: {
			    error: '',
			},
			tpl: '<i class="fa fa-warning warning"></i> {error}',
			reference: 'webAuthnError',
			hidden: true,
		    },
		],
	    },
	    {
		xtype: 'panel',
		title: gettext('TOTP App'),
		iconCls: 'fa fa-fw fa-clock-o',
		handler: 'loginTotp',
		bind: {
		    disabled: '{!availableChallenge.totp}',
		},
		items: [
		    {
			xtype: 'textfield',
			fieldLabel: gettext('Please enter your TOTP verification code'),
			labelWidth: 300,
			name: 'totp',
			disabled: true,
			reference: 'totp',
			allowBlank: false,
			regex: /^[0-9]{2,16}$/,
			regexText: gettext('TOTP codes usually consist of six decimal digits'),
			inputAttrTpl: 'autocomplete=one-time-code',
		    },
		],
	    },
	    {
		xtype: 'panel',
		title: gettext('Recovery Key'),
		iconCls: 'fa fa-fw fa-file-text-o',
		handler: 'loginRecovery',
		bind: {
		    disabled: '{!availableChallenge.recovery}',
		},
		items: [
		    {
			xtype: 'box',
			reference: 'cannotLogin',
			hidden: true,
			html: '<i class="fa fa-exclamation-triangle warning"></i>'
			    + Ext.String.format(
				gettext('No second factor left! Please contact an administrator!'),
				4,
			    ),
		    },
		    {
			xtype: 'box',
			reference: 'recoveryEmpty',
			hidden: true,
			html: '<i class="fa fa-exclamation-triangle warning"></i>'
			    + Ext.String.format(
				gettext('No more recovery keys left! Please generate a new set!'),
				4,
			    ),
		    },
		    {
			xtype: 'box',
			reference: 'recoveryLow',
			hidden: true,
			html: '<i class="fa fa-exclamation-triangle warning"></i>'
			    + Ext.String.format(
				gettext('Less than {0} recovery keys available. Please generate a new set after login!'),
				4,
			    ),
		    },
		    {
			xtype: 'box',
			reference: 'availableRecovery',
			hidden: true,
		    },
		    {
			xtype: 'textfield',
			fieldLabel: gettext('Please enter one of your single-use recovery keys'),
			labelWidth: 300,
			name: 'recoveryKey',
			disabled: true,
			reference: 'recoveryKey',
			allowBlank: false,
			regex: /^[0-9a-f]{4}(-[0-9a-f]{4}){3}$/,
			regexText: gettext('Does not look like a valid recovery key'),
		    },
		],
	    },
	    {
		xtype: 'panel',
		title: 'U2F',
		iconCls: 'fa fa-fw fa-shield',
		confirmText: gettext('Start U2F challenge'),
		handler: 'loginU2F',
		bind: {
		    disabled: '{!availableChallenge.u2f}',
		},
		tabConfig: {
		    bind: {
			hidden: '{!availableChallenge.u2f}',
		    },
		},
		items: [
		    {
			xtype: 'box',
			html: gettext('Please insert your authentication device and press its button'),
		    },
		    {
			xtype: 'box',
			html: gettext('Waiting for second factor.') +`<i class="fa fa-refresh fa-spin fa-fw"></i>`,
			reference: 'u2fWaiting',
			hidden: true,
		    },
		    {
			xtype: 'box',
			data: {
			    error: '',
			},
			tpl: '<i class="fa fa-warning warning"></i> {error}',
			reference: 'u2fError',
			hidden: true,
		    },
		],
	    },
	    {
		xtype: 'panel',
		title: gettext('Yubico OTP'),
		iconCls: 'fa fa-fw fa-yahoo',
		handler: 'loginYubico',
		bind: {
		    disabled: '{!availableChallenge.yubico}',
		},
		tabConfig: {
		    bind: {
			hidden: '{!availableChallenge.yubico}',
		    },
		},
		items: [
		    {
			xtype: 'textfield',
			fieldLabel: gettext('Please enter your Yubico OTP code'),
			labelWidth: 300,
			name: 'yubico',
			disabled: true,
			reference: 'yubico',
			allowBlank: false,
			regex: /^[a-z0-9]{30,60}$/, // *should* be 44 but not sure if that's "fixed"
			regexText: gettext('TOTP codes consist of six decimal digits'),
		    },
		],
	    },
	],
    }],

    buttons: [
	{
	    handler: 'loginTFA',
	    reference: 'tfaButton',
	    disabled: true,
	    bind: {
		text: '{confirmText}',
		disabled: '{!canConfirm}',
	    },
	},
    ],
});

/* help button pointing to an online documentation
   for components contained in a modal window
*/
Ext.define('Proxmox.button.Help', {
    extend: 'Ext.button.Button',
    xtype: 'proxmoxHelpButton',

    text: gettext('Help'),

    // make help button less flashy by styling it like toolbar buttons
    iconCls: ' x-btn-icon-el-default-toolbar-small fa fa-question-circle',
    cls: 'x-btn-default-toolbar-small proxmox-inline-button',

    hidden: true,

    listenToGlobalEvent: true,

    controller: {
	xclass: 'Ext.app.ViewController',
	listen: {
	    global: {
		proxmoxShowHelp: 'onProxmoxShowHelp',
		proxmoxHideHelp: 'onProxmoxHideHelp',
	    },
	},
	onProxmoxShowHelp: function(helpLink) {
	    let view = this.getView();
	    if (view.listenToGlobalEvent === true) {
		view.setOnlineHelp(helpLink);
		view.show();
	    }
	},
	onProxmoxHideHelp: function() {
	    let view = this.getView();
	    if (view.listenToGlobalEvent === true) {
		view.hide();
	    }
	},
    },

    // this sets the link and the tooltip text
    setOnlineHelp: function(blockid) {
	let me = this;

	let info = Proxmox.Utils.get_help_info(blockid);
	if (info) {
	    me.onlineHelp = blockid;
	    let title = info.title;
	    if (info.subtitle) {
		title += ' - ' + info.subtitle;
	    }
	    me.setTooltip(title);
	}
    },

    // helper to set the onlineHelp via a config object
    setHelpConfig: function(config) {
	let me = this;
	me.setOnlineHelp(config.onlineHelp);
    },

    handler: function() {
	let me = this;
	let docsURI;

	if (me.onlineHelp) {
	    docsURI = Proxmox.Utils.get_help_link(me.onlineHelp);
	}

	if (docsURI) {
	    window.open(docsURI);
	} else {
	    Ext.Msg.alert(gettext('Help'), gettext('No Help available'));
	}
    },

    initComponent: function() {
	let me = this;

	me.callParent();

	if (me.onlineHelp) {
	    me.setOnlineHelp(me.onlineHelp); // set tooltip
	}
    },
});

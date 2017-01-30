Ext.ns('Proxmox');
Ext.ns('Proxmox.Setup');

// TODO: implement gettext
function gettext(buf) { return buf; }


if (!Ext.isDefined(Proxmox.Setup.auth_cookie)) {
    trow "Proxmox library not initialize";
}

// avoid errors related to Accessible Rich Internet Applications
// (access for people with disabilities)
// TODO reenable after all components are upgraded
Ext.enableAria = false;
Ext.enableAriaButtons = false;
Ext.enableAriaPanels = false;

// avoid errors when running without development tools
if (!Ext.isDefined(Ext.global.console)) {
    var console = {
	dir: function() {},
	log: function() {}
    };
}

Ext.Ajax.defaultHeaders = {
    'Accept': 'application/json'
};

Ext.Ajax.on('beforerequest', function(conn, options) {
    if (Proxmox.CSRFPreventionToken) {
	if (!options.headers) {
	    options.headers = {};
	}
	options.headers.CSRFPreventionToken = Proxmox.CSRFPreventionToken;
    }
});

Ext.define('Proxmox.Utils', { utilities: {

    // this singleton contains miscellaneous utilities

    authOK: function() {
	return (Proxmox.UserName !== '') && Ext.util.Cookies.get(Proxmox.Setup.auth_cookie_name);
    },

    authClear: function() {
	Ext.util.Cookies.clear(Proxmox.Setup.auth_cookie_name);
    },

    // comp.setLoading() is buggy in ExtJS 4.0.7, so we
    // use el.mask() instead
    setErrorMask: function(comp, msg) {
	var el = comp.el;
	if (!el) {
	    return;
	}
	if (!msg) {
	    el.unmask();
	} else {
	    if (msg === true) {
		el.mask(gettext("Loading..."));
	    } else {
		el.mask(msg);
	    }
	}
    },

    monStoreErrors: function(me, store) {
	me.mon(store, 'beforeload', function(s, operation, eOpts) {
	    if (!me.loadCount) {
		me.loadCount = 0; // make sure it is numeric
		Proxmox.Utils.setErrorMask(me, true);
	    }
	});

	// only works with 'proxmox' proxy
	me.mon(store.proxy, 'afterload', function(proxy, request, success) {
	    me.loadCount++;

	    if (success) {
		Proxmox.Utils.setErrorMask(me, false);
		return;
	    }

	    var msg;
	    /*jslint nomen: true */
	    var operation = request._operation;
	    var error = operation.getError();
	    if (error.statusText) {
		msg = error.statusText + ' (' + error.status + ')';
	    } else {
		msg = gettext('Connection error');
	    }
	    Proxmox.Utils.setErrorMask(me, msg);
	});
    },

    extractRequestError: function(result, verbose) {
	var msg = gettext('Successful');

	if (!result.success) {
	    msg = gettext("Unknown error");
	    if (result.message) {
		msg = result.message;
		if (result.status) {
		    msg += ' (' + result.status + ')';
		}
	    }
	    if (verbose && Ext.isObject(result.errors)) {
		msg += "<br>";
		Ext.Object.each(result.errors, function(prop, desc) {
		    msg += "<br><b>" + Ext.htmlEncode(prop) + "</b>: " +
			Ext.htmlEncode(desc);
		});
	    }
	}

	return msg;
    },

    // Ext.Ajax.request
    API2Request: function(reqOpts) {

	var newopts = Ext.apply({
	    waitMsg: gettext('Please wait...')
	}, reqOpts);

	if (!newopts.url.match(/^\/api2/)) {
	    newopts.url = '/api2/extjs' + newopts.url;
	}
	delete newopts.callback;

	var createWrapper = function(successFn, callbackFn, failureFn) {
	    Ext.apply(newopts, {
		success: function(response, options) {
		    if (options.waitMsgTarget) {
			options.waitMsgTarget.setLoading(false);
		    }
		    var result = Ext.decode(response.responseText);
		    response.result = result;
		    if (!result.success) {
			response.htmlStatus = Proxmox.Utils.extractRequestError(result, true);
			Ext.callback(callbackFn, options.scope, [options, false, response]);
			Ext.callback(failureFn, options.scope, [response, options]);
			return;
		    }
		    Ext.callback(callbackFn, options.scope, [options, true, response]);
		    Ext.callback(successFn, options.scope, [response, options]);
		},
		failure: function(response, options) {
		    if (options.waitMsgTarget) {
			options.waitMsgTarget.setLoading(false);
		    }
		    response.result = {};
		    try {
			response.result = Ext.decode(response.responseText);
		    } catch(e) {}
		    var msg = gettext('Connection error') + ' - server offline?';
		    if (response.aborted) {
			msg = gettext('Connection error') + ' - aborted.';
		    } else if (response.timedout) {
			msg = gettext('Connection error') + ' - Timeout.';
		    } else if (response.status && response.statusText) {
			msg = gettext('Connection error') + ' ' + response.status + ': ' + response.statusText;
		    }
		    response.htmlStatus = msg;
		    Ext.callback(callbackFn, options.scope, [options, false, response]);
		    Ext.callback(failureFn, options.scope, [response, options]);
		}
	    });
	};

	createWrapper(reqOpts.success, reqOpts.callback, reqOpts.failure);

	var target = newopts.waitMsgTarget;
	if (target) {
	    // Note: ExtJS bug - this does not work when component is not rendered
	    target.setLoading(newopts.waitMsg);
	}
	Ext.Ajax.request(newopts);
    },

    },
			  
    singleton: true,
    constructor: function() {
	var me = this;
	Ext.apply(me, me.utilities);

	var IPV4_OCTET = "(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])";
	var IPV4_REGEXP = "(?:(?:" + IPV4_OCTET + "\\.){3}" + IPV4_OCTET + ")";
	var IPV6_H16 = "(?:[0-9a-fA-F]{1,4})";
	var IPV6_LS32 = "(?:(?:" + IPV6_H16 + ":" + IPV6_H16 + ")|" + IPV4_REGEXP + ")";


	me.IP4_match = new RegExp("^(?:" + IPV4_REGEXP + ")$");
	me.IP4_cidr_match = new RegExp("^(?:" + IPV4_REGEXP + ")\/([0-9]{1,2})$");

	var IPV6_REGEXP = "(?:" +
	    "(?:(?:"                                                  + "(?:" + IPV6_H16 + ":){6})" + IPV6_LS32 + ")|" +
	    "(?:(?:"                                         +   "::" + "(?:" + IPV6_H16 + ":){5})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:"                           + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){4})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,1}" + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){3})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,2}" + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){2})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,3}" + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){1})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,4}" + IPV6_H16 + ")?::" +                         ")" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,5}" + IPV6_H16 + ")?::" +                         ")" + IPV6_H16  + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,7}" + IPV6_H16 + ")?::" +                         ")"             + ")"  +
	    ")";

	me.IP6_match = new RegExp("^(?:" + IPV6_REGEXP + ")$");
	me.IP6_cidr_match = new RegExp("^(?:" + IPV6_REGEXP + ")\/([0-9]{1,3})$");
	me.IP6_bracket_match = new RegExp("^\\[(" + IPV6_REGEXP + ")\\]");

	me.IP64_match = new RegExp("^(?:" + IPV6_REGEXP + "|" + IPV4_REGEXP + ")$");

	var DnsName_REGEXP = "(?:(([a-zA-Z0-9]([a-zA-Z0-9\\-]*[a-zA-Z0-9])?)\\.)*([A-Za-z0-9]([A-Za-z0-9\\-]*[A-Za-z0-9])?))";
	me.DnsName_match = new RegExp("^" + DnsName_REGEXP + "$");

	me.HostPort_match = new RegExp("^(" + IPV4_REGEXP + "|" + DnsName_REGEXP + ")(:\\d+)?$");
	me.HostPortBrackets_match = new RegExp("^\\[(?:" + IPV6_REGEXP + "|" + IPV4_REGEXP + "|" + DnsName_REGEXP + ")\\](:\\d+)?$");
	me.IP6_dotnotation_match = new RegExp("^" + IPV6_REGEXP + "(\\.\\d+)?$");
    }
});

Ext.define('Proxmox.Mixin.CBind', {
    extend: 'Ext.Mixin',

    mixinConfig: {
        before: {
            initComponent: 'cloneTemplates'
        }
    },

    cloneTemplates: function() {
	var me = this;

 	if (typeof(me.cbindData) == "function") {
	    me.cbindData = me.cbindData(me.initialConfig);
	}
	me.cbindData = me.cbindData || {};

	var getConfigValue = function(cname) {

	    if (cname in me.initialConfig) {
		return me.initialConfig[cname];
	    }
	    if (cname in me.cbindData) {
		return me.cbindData[cname];
	    }
	    if (cname in me) {
		return me[cname];
	    }
	    throw "unable to get cbind data for '" + cname + "'";
	};

	var applyCBind = function(obj) {
	    var cbind = obj.cbind, prop, cdata, cvalue, match, found;
	    if (!cbind) return;

	    for (prop in cbind) {
		cdata = cbind[prop];

		found = false;
		if (match = /^\{(!)?([a-z_][a-z0-9_]*)\}$/i.exec(cdata)) {
		    var cvalue = getConfigValue(match[2]);
		    if (match[1]) cvalue = !cvalue;
		    obj[prop] = cvalue;
		    found = true;
		} else if (match = /^\{(!)?([a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)+)\}$/i.exec(cdata)) {
		    var keys = match[2].split('.');
		    var cvalue = getConfigValue(keys.shift());
		    keys.forEach(function(k) {
			if (k in cvalue) {
			    cvalue = cvalue[k];
			} else {
			    throw "unable to get cbind data for '" + match[2] + "'";
			}
		    });
		    if (match[1]) cvalue = !cvalue;
		    obj[prop] = cvalue;
		    found = true;
		} else {
		    obj[prop] = cdata.replace(/{([a-z_][a-z0-9_]*)\}/ig, function(match, cname) {
			var cvalue = getConfigValue(cname);
			found = true;
			return cvalue;
		    });
		}
		if (!found) {
		    throw "unable to parse cbind template '" + cdata + "'";
		}

	    }
	};

	if (me.cbind) {
	    applyCBind(me);
	}

	var cloneTemplateArray = function(org) {
	    var copy, i, found, el, elcopy, arrayLength;

	    arrayLength = org.length;
	    found = false;
	    for (i = 0; i < arrayLength; i++) {
		el = org[i];
		if (el.constructor == Object && el.xtype) {
		    found = true;
		    break;
		}
	    }

	    if (!found) return org; // no need to copy

	    copy = [];
	    for (i = 0; i < arrayLength; i++) {
		el = org[i];
		if (el.constructor == Object && el.xtype) {
		    elcopy = cloneTemplateObject(el);
		    if (elcopy.cbind) {
			applyCBind(elcopy);
		    }
		    copy.push(elcopy);
		} else if (el.constructor == Array) {
		    elcopy = cloneTemplateArray(el);
		    copy.push(elcopy);
		} else {
		    copy.push(el);
		}
	    }
	    return copy;
	};

	var cloneTemplateObject = function(org) {
	    var res = {}, prop, el, copy;
	    for (prop in org) {
		el = org[prop];
		if (el === undefined || el === null) {
		    res[prop] = el;
		    continue;
		}
		if (el.constructor == Object && el.xtype) {
		    copy = cloneTemplateObject(el);
		    if (copy.cbind) {
			applyCBind(copy);
		    }
		    res[prop] = copy;
		} else if (el.constructor == Array) {
		    copy = cloneTemplateArray(el);
		    res[prop] = copy;
		} else {
		    res[prop] = el;
		}
	    }
	    return res;
	};

	var condCloneProperties = function() {
	    var prop, el, i, tmp;

	    for (prop in me) {
		el = me[prop];
		if (el === undefined || el === null) continue;
		if (typeof(el) === 'object' && el.constructor == Object) {
		    if (el.xtype && prop != 'config') {
			me[prop] = cloneTemplateObject(el);
		    }
		} else if (el.constructor == Array) {
		    tmp = cloneTemplateArray(el);
		    me[prop] = tmp;
		}
	    }
	};

	condCloneProperties();
    }
});

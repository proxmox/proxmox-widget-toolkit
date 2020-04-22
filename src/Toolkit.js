// ExtJS related things

 // do not send '_dc' parameter
Ext.Ajax.disableCaching = false;

// FIXME: HACK! Makes scrolling in number spinner work again. fixed in ExtJS >= 6.1
if (Ext.isFirefox) {
    Ext.$eventNameMap.DOMMouseScroll = 'DOMMouseScroll';
}

// custom Vtypes
Ext.apply(Ext.form.field.VTypes, {
    IPAddress: function(v) {
	return Proxmox.Utils.IP4_match.test(v);
    },
    IPAddressText: gettext('Example') + ': 192.168.1.1',
    IPAddressMask: /[\d.]/i,

    IPCIDRAddress: function(v) {
	let result = Proxmox.Utils.IP4_cidr_match.exec(v);
	// limits according to JSON Schema see
	// pve-common/src/PVE/JSONSchema.pm
	return result !== null && result[1] >= 8 && result[1] <= 32;
    },
    IPCIDRAddressText: gettext('Example') + ': 192.168.1.1/24<br>' + gettext('Valid CIDR Range') + ': 8-32',
    IPCIDRAddressMask: /[\d./]/i,

    IP6Address: function(v) {
        return Proxmox.Utils.IP6_match.test(v);
    },
    IP6AddressText: gettext('Example') + ': 2001:DB8::42',
    IP6AddressMask: /[A-Fa-f0-9:]/,

    IP6CIDRAddress: function(v) {
	let result = Proxmox.Utils.IP6_cidr_match.exec(v);
	// limits according to JSON Schema see
	// pve-common/src/PVE/JSONSchema.pm
	return result !== null && result[1] >= 8 && result[1] <= 128;
    },
    IP6CIDRAddressText: gettext('Example') + ': 2001:DB8::42/64<br>' + gettext('Valid CIDR Range') + ': 8-128',
    IP6CIDRAddressMask: /[A-Fa-f0-9:/]/,

    IP6PrefixLength: function(v) {
	return v >= 0 && v <= 128;
    },
    IP6PrefixLengthText: gettext('Example') + ': X, where 0 <= X <= 128',
    IP6PrefixLengthMask: /[0-9]/,

    IP64Address: function(v) {
        return Proxmox.Utils.IP64_match.test(v);
    },
    IP64AddressText: gettext('Example') + ': 192.168.1.1 2001:DB8::42',
    IP64AddressMask: /[A-Fa-f0-9.:]/,

    IP64CIDRAddress: function(v) {
	let result = Proxmox.Utils.IP64_cidr_match.exec(v);
	if (result === null) {
	    return false;
	}
	if (result[1] !== undefined) {
	    return result[1] >= 8 && result[1] <= 128;
	} else if (result[2] !== undefined) {
	    return result[2] >= 8 && result[2] <= 32;
	} else {
	    return false;
	}
    },
    IP64CIDRAddressText: gettext('Example') + ': 192.168.1.1/24 2001:DB8::42/64',
    IP64CIDRAddressMask: /[A-Fa-f0-9.:/]/,

    MacAddress: function(v) {
	return (/^([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}$/).test(v);
    },
    MacAddressMask: /[a-fA-F0-9:]/,
    MacAddressText: gettext('Example') + ': 01:23:45:67:89:ab',

    MacPrefix: function(v) {
	return (/^[a-f0-9][02468ace](?::[a-f0-9]{2}){0,2}:?$/i).test(v);
    },
    MacPrefixMask: /[a-fA-F0-9:]/,
    MacPrefixText: gettext('Example') + ': 02:8f - ' + gettext('only unicast addresses are allowed'),

    BridgeName: function(v) {
        return (/^vmbr\d{1,4}$/).test(v);
    },
    VlanName: function(v) {
       if (Proxmox.Utils.VlanInterface_match.test(v)) {
         return true;
       } else if (Proxmox.Utils.Vlan_match.test(v)) {
         return true;
       }
       return true;
    },
    BridgeNameText: gettext('Format') + ': vmbr<b>N</b>, where 0 <= <b>N</b> <= 9999',

    BondName: function(v) {
        return (/^bond\d{1,4}$/).test(v);
    },
    BondNameText: gettext('Format') + ': bond<b>N</b>, where 0 <= <b>N</b> <= 9999',

    InterfaceName: function(v) {
        return (/^[a-z][a-z0-9_]{1,20}$/).test(v);
    },
    InterfaceNameText: gettext("Allowed characters") + ": 'a-z', '0-9', '_'<br />" +
		       gettext("Minimum characters") + ": 2<br />" +
		       gettext("Maximum characters") + ": 21<br />" +
		       gettext("Must start with") + ": 'a-z'",

    StorageId: function(v) {
        return (/^[a-z][a-z0-9\-_.]*[a-z0-9]$/i).test(v);
    },
    StorageIdText: gettext("Allowed characters") + ":  'A-Z', 'a-z', '0-9', '-', '_', '.'<br />" +
		   gettext("Minimum characters") + ": 2<br />" +
		   gettext("Must start with") + ": 'A-Z', 'a-z'<br />" +
		   gettext("Must end with") + ": 'A-Z', 'a-z', '0-9'<br />",

    ConfigId: function(v) {
        return (/^[a-z][a-z0-9_]+$/i).test(v);
    },
    ConfigIdText: gettext("Allowed characters") + ": 'A-Z', 'a-z', '0-9', '_'<br />" +
		  gettext("Minimum characters") + ": 2<br />" +
		  gettext("Must start with") + ": " + gettext("letter"),

    HttpProxy: function(v) {
        return (/^http:\/\/.*$/).test(v);
    },
    HttpProxyText: gettext('Example') + ": http://username:password&#64;host:port/",

    DnsName: function(v) {
	return Proxmox.Utils.DnsName_match.test(v);
    },
    DnsNameText: gettext('This is not a valid DNS name'),

    // workaround for https://www.sencha.com/forum/showthread.php?302150
    proxmoxMail: function(v) {
        return (/^(\w+)([-+.][\w]+)*@(\w[-\w]*\.){1,5}([A-Za-z]){2,63}$/).test(v);
    },
    proxmoxMailText: gettext('Example') + ": user@example.com",

    DnsOrIp: function(v) {
	if (!Proxmox.Utils.DnsName_match.test(v) &&
	    !Proxmox.Utils.IP64_match.test(v)) {
	    return false;
	}

	return true;
    },
    DnsOrIpText: gettext('Not a valid DNS name or IP address.'),

    HostPort: function(v) {
	return Proxmox.Utils.HostPort_match.test(v) ||
		Proxmox.Utils.HostPortBrackets_match.test(v) ||
		Proxmox.Utils.IP6_dotnotation_match.test(v);
    },

    HostPortText: gettext('Not a valid hosts'),

    HostList: function(v) {
	let list = v.split(/[ ,;]+/);
	let i;
	for (i = 0; i < list.length; i++) {
	    if (list[i] === '') {
		continue;
	    }

	    if (!Proxmox.Utils.HostPort_match.test(list[i]) &&
		!Proxmox.Utils.HostPortBrackets_match.test(list[i]) &&
		!Proxmox.Utils.IP6_dotnotation_match.test(list[i])) {
		return false;
	    }
	}

	return true;
    },
    HostListText: gettext('Not a valid list of hosts'),

    password: function(val, field) {
        if (field.initialPassField) {
            let pwd = field.up('form').down(`[name=${field.initialPassField}]`);
            return val === pwd.getValue();
        }
        return true;
    },

    passwordText: gettext('Passwords do not match'),
});

// Firefox 52+ Touchscreen bug
// see https://www.sencha.com/forum/showthread.php?336762-Examples-don-t-work-in-Firefox-52-touchscreen/page2
// and https://bugzilla.proxmox.com/show_bug.cgi?id=1223
Ext.define('EXTJS_23846.Element', {
    override: 'Ext.dom.Element',
}, function(Element) {
    let supports = Ext.supports,
        proto = Element.prototype,
        eventMap = proto.eventMap,
        additiveEvents = proto.additiveEvents;

    if (Ext.os.is.Desktop && supports.TouchEvents && !supports.PointerEvents) {
        eventMap.touchstart = 'mousedown';
        eventMap.touchmove = 'mousemove';
        eventMap.touchend = 'mouseup';
        eventMap.touchcancel = 'mouseup';

        additiveEvents.mousedown = 'mousedown';
        additiveEvents.mousemove = 'mousemove';
        additiveEvents.mouseup = 'mouseup';
        additiveEvents.touchstart = 'touchstart';
        additiveEvents.touchmove = 'touchmove';
        additiveEvents.touchend = 'touchend';
        additiveEvents.touchcancel = 'touchcancel';

        additiveEvents.pointerdown = 'mousedown';
        additiveEvents.pointermove = 'mousemove';
        additiveEvents.pointerup = 'mouseup';
        additiveEvents.pointercancel = 'mouseup';
    }
});

Ext.define('EXTJS_23846.Gesture', {
    override: 'Ext.event.publisher.Gesture',
}, function(Gesture) {
    let gestures = Gesture.instance;

    if (Ext.supports.TouchEvents && !Ext.isWebKit && Ext.os.is.Desktop) {
        gestures.handledDomEvents.push('mousedown', 'mousemove', 'mouseup');
        gestures.registerEvents();
    }
});

Ext.define('EXTJS_18900.Pie', {
    override: 'Ext.chart.series.Pie',

    // from 6.0.2
    betweenAngle: function(x, a, b) {
        let pp = Math.PI * 2,
            offset = this.rotationOffset;

        if (a === b) {
            return false;
        }

        if (!this.getClockwise()) {
            x *= -1;
            a *= -1;
            b *= -1;
            a -= offset;
            b -= offset;
        } else {
            a += offset;
            b += offset;
        }

        x -= a;
        b -= a;

        // Normalize, so that both x and b are in the [0,360) interval.
        x %= pp;
        b %= pp;
        x += pp;
        b += pp;
        x %= pp;
        b %= pp;

        // Because 360 * n angles will be normalized to 0,
        // we need to treat b === 0 as a special case.
        return x < b || b === 0;
    },
});

// we always want the number in x.y format and never in, e.g., x,y
Ext.define('PVE.form.field.Number', {
    override: 'Ext.form.field.Number',
    submitLocaleSeparator: false,
});

// ExtJs 5-6 has an issue with caching
// see https://www.sencha.com/forum/showthread.php?308989
Ext.define('Proxmox.UnderlayPool', {
    override: 'Ext.dom.UnderlayPool',

    checkOut: function() {
        let cache = this.cache,
            len = cache.length,
            el;

        // do cleanup because some of the objects might have been destroyed
	while (len--) {
            if (cache[len].destroyed) {
                cache.splice(len, 1);
            }
        }
        // end do cleanup

	el = cache.shift();

        if (!el) {
            el = Ext.Element.create(this.elementConfig);
            el.setVisibilityMode(2);
            //<debug>
            // tell the spec runner to ignore this element when checking if the dom is clean
	    el.dom.setAttribute('data-sticky', true);
            //</debug>
	}

        return el;
    },
});

// 'Enter' in Textareas and aria multiline fields should not activate the
// defaultbutton, fixed in extjs 6.0.2
Ext.define('PVE.panel.Panel', {
    override: 'Ext.panel.Panel',

    fireDefaultButton: function(e) {
	if (e.target.getAttribute('aria-multiline') === 'true' ||
	    e.target.tagName === "TEXTAREA") {
	    return true;
	}
	return this.callParent(arguments);
    },
});

// if the order of the values are not the same in originalValue and value
// extjs will not overwrite value, but marks the field dirty and thus
// the reset button will be enabled (but clicking it changes nothing)
// so if the arrays are not the same after resetting, we
// clear and set it
Ext.define('Proxmox.form.ComboBox', {
    override: 'Ext.form.field.ComboBox',

    reset: function() {
	// copied from combobox
	let me = this;
	me.callParent();

	// clear and set when not the same
	let value = me.getValue();
	if (Ext.isArray(me.originalValue) && Ext.isArray(value) &&
	    !Ext.Array.equals(value, me.originalValue)) {
	    me.clearValue();
	    me.setValue(me.originalValue);
	}
    },

    // we also want to open the trigger on editable comboboxes by default
    initComponent: function() {
	let me = this;
	me.callParent();

	if (me.editable) {
	    // The trigger.picker causes first a focus event on the field then
	    // toggles the selection picker. Thus skip expanding in this case,
	    // else our focus listener expands and the picker.trigger then
	    // collapses it directly afterwards.
	    Ext.override(me.triggers.picker, {
		onMouseDown: function(e) {
		    // copied "should we focus" check from Ext.form.trigger.Trigger
		    if (e.pointerType !== 'touch' && !this.field.owns(Ext.Element.getActiveElement())) {
			me.skip_expand_on_focus = true;
		    }
		    this.callParent(arguments);
		},
	    });

	    me.on("focus", function(combobox) {
		if (!combobox.isExpanded && !combobox.skip_expand_on_focus) {
		    combobox.expand();
		}
		combobox.skip_expand_on_focus = false;
	    });
	}
    },
});

// when refreshing a grid/tree view, restoring the focus moves the view back to
// the previously focused item. Save scroll position before refocusing.
Ext.define(null, {
    override: 'Ext.view.Table',

    jumpToFocus: false,

    saveFocusState: function() {
	let me = this,
	    store = me.dataSource,
	    actionableMode = me.actionableMode,
	    navModel = me.getNavigationModel(),
	    focusPosition = actionableMode ? me.actionPosition : navModel.getPosition(true),
	    refocusRow, refocusCol;

	if (focusPosition) {
	    // Separate this from the instance that the nav model is using.
	    focusPosition = focusPosition.clone();

	    // Exit actionable mode.
	    // We must inform any Actionables that they must relinquish control.
	    // Tabbability must be reset.
	    if (actionableMode) {
		me.ownerGrid.setActionableMode(false);
	    }

	    // Blur the focused descendant, but do not trigger focusLeave.
	    me.el.dom.focus();

	    // Exiting actionable mode navigates to the owning cell, so in either focus mode we must
	    // clear the navigation position
	    navModel.setPosition();

	    // The following function will attempt to refocus back in the same mode to the same cell
	    // as it was at before based upon the previous record (if it's still inthe store), or the row index.
	    return function() {
		// If we still have data, attempt to refocus in the same mode.
		if (store.getCount()) {
		    // Adjust expectations of where we are able to refocus according to what kind of destruction
		    // might have been wrought on this view's DOM during focus save.
		    refocusRow = Math.min(focusPosition.rowIdx, me.all.getCount() - 1);
		    refocusCol = Math.min(focusPosition.colIdx,
					  me.getVisibleColumnManager().getColumns().length - 1);
		    refocusRow = store.contains(focusPosition.record) ? focusPosition.record : refocusRow;
		    focusPosition = new Ext.grid.CellContext(me).setPosition(refocusRow, refocusCol);

		    if (actionableMode) {
			me.ownerGrid.setActionableMode(true, focusPosition);
		    } else {
			me.cellFocused = true;

			// we sometimes want to scroll back to where we were
			let x = me.getScrollX();
			let y = me.getScrollY();

			// Pass "preventNavigation" as true so that that does not cause selection.
			navModel.setPosition(focusPosition, null, null, null, true);

			if (!me.jumpToFocus) {
			    me.scrollTo(x, y);
			}
		    }
		} else { // No rows - focus associated column header
		    focusPosition.column.focus();
		}
	    };
	}
	return Ext.emptyFn;
    },
});

// should be fixed with ExtJS 6.0.2, see:
// https://www.sencha.com/forum/showthread.php?307244-Bug-with-datefield-in-window-with-scroll
Ext.define('Proxmox.Datepicker', {
    override: 'Ext.picker.Date',
    hideMode: 'visibility',
});

// ExtJS 6.0.1 has no setSubmitValue() (although you find it in the docs).
// Note: this.submitValue is a boolean flag, whereas getSubmitValue() returns
// data to be submitted.
Ext.define('Proxmox.form.field.Text', {
    override: 'Ext.form.field.Text',

    setSubmitValue: function(v) {
	this.submitValue = v;
    },
});

// this should be fixed with ExtJS 6.0.2
// make mousescrolling work in firefox in the containers overflowhandler
Ext.define(null, {
    override: 'Ext.layout.container.boxOverflow.Scroller',

    createWheelListener: function() {
	let me = this;
	if (Ext.isFirefox) {
	    me.wheelListener = me.layout.innerCt.on('wheel', me.onMouseWheelFirefox, me, { destroyable: true });
	} else {
	    me.wheelListener = me.layout.innerCt.on('mousewheel', me.onMouseWheel, me, { destroyable: true });
	}
    },

    // special wheel handler for firefox. differs from the default onMouseWheel
    // handler by using deltaY instead of wheelDeltaY and no normalizing,
    // because it is already
    onMouseWheelFirefox: function(e) {
	e.stopEvent();
	let delta = e.browserEvent.deltaY || 0;
	this.scrollBy(delta * this.wheelIncrement, false);
    },

});

// add '@' to the valid id
Ext.define('Proxmox.validIdReOverride', {
    override: 'Ext.Component',
    validIdRe: /^[a-z_][a-z0-9\-_@]*$/i,
});

// use whole checkbox cell to multiselect, not only the checkbox
Ext.define('Proxmox.selection.CheckboxModel', {
    override: 'Ext.selection.CheckboxModel',

    checkSelector: '.x-grid-cell-row-checker',
});

// force alert boxes to be rendered with an Error Icon
// since Ext.Msg is an object and not a prototype, we need to override it
// after the framework has been initiated
Ext.onReady(function() {
/*jslint confusion: true */
    Ext.override(Ext.Msg, {
	alert: function(title, message, fn, scope) { // eslint-disable-line consistent-return
	    if (Ext.isString(title)) {
		let config = {
		    title: title,
		    message: message,
		    icon: this.ERROR,
		    buttons: this.OK,
		    fn: fn,
		    scope: scope,
		    minWidth: this.minWidth,
		};
	    return this.show(config);
	    }
	},
    });
/*jslint confusion: false */
});
Ext.define('Ext.ux.IFrame', {
    extend: 'Ext.Component',

    alias: 'widget.uxiframe',

    loadMask: 'Loading...',

    src: 'about:blank',

    renderTpl: [
        '<iframe src="{src}" id="{id}-iframeEl" data-ref="iframeEl" name="{frameName}" width="100%" height="100%" frameborder="0" allowfullscreen="true"></iframe>',
    ],
    childEls: ['iframeEl'],

    initComponent: function() {
        this.callParent();

        this.frameName = this.frameName || this.id + '-frame';
    },

    initEvents: function() {
        let me = this;
        me.callParent();
        me.iframeEl.on('load', me.onLoad, me);
    },

    initRenderData: function() {
        return Ext.apply(this.callParent(), {
            src: this.src,
            frameName: this.frameName,
        });
    },

    getBody: function() {
        let doc = this.getDoc();
        return doc.body || doc.documentElement;
    },

    getDoc: function() {
        try {
            return this.getWin().document;
        } catch (ex) {
            return null;
        }
    },

    getWin: function() {
        let me = this,
            name = me.frameName,
            win = Ext.isIE
                ? me.iframeEl.dom.contentWindow
                : window.frames[name];
        return win;
    },

    getFrame: function() {
        let me = this;
        return me.iframeEl.dom;
    },

    beforeDestroy: function() {
        this.cleanupListeners(true);
        this.callParent();
    },

    cleanupListeners: function(destroying) {
        let doc, prop;

        if (this.rendered) {
            try {
                doc = this.getDoc();
                if (doc) {
                    Ext.get(doc).un(this._docListeners);
                    if (destroying && doc.hasOwnProperty) {
                        for (prop in doc) {
                            if (Object.prototype.hasOwnProperty.call(doc, prop)) {
                                delete doc[prop];
                            }
                        }
                    }
                }
            } catch (e) {
                // do nothing
            }
        }
    },

    onLoad: function() {
        let me = this,
            doc = me.getDoc(),
            fn = me.onRelayedEvent;

        if (doc) {
            try {
                // These events need to be relayed from the inner document (where they stop
                // bubbling) up to the outer document. This has to be done at the DOM level so
                // the event reaches listeners on elements like the document body. The effected
                // mechanisms that depend on this bubbling behavior are listed to the right
                // of the event.
		/*jslint nomen: true*/
                Ext.get(doc).on(
                    me._docListeners = {
                        mousedown: fn, // menu dismisal (MenuManager) and Window onMouseDown (toFront)
                        mousemove: fn, // window resize drag detection
                        mouseup: fn, // window resize termination
                        click: fn, // not sure, but just to be safe
                        dblclick: fn, // not sure again
                        scope: me,
                    },
                );
		/*jslint nomen: false*/
            } catch (e) {
                // cannot do this xss
            }

            // We need to be sure we remove all our events from the iframe on unload or we're going to LEAK!
            Ext.get(this.getWin()).on('beforeunload', me.cleanupListeners, me);

            this.el.unmask();
            this.fireEvent('load', this);
        } else if (me.src) {
            this.el.unmask();
            this.fireEvent('error', this);
        }
    },

    onRelayedEvent: function(event) {
        // relay event from the iframe's document to the document that owns the iframe...

        let iframeEl = this.iframeEl,

            // Get the left-based iframe position
            iframeXY = iframeEl.getTrueXY(),
            originalEventXY = event.getXY(),

            // Get the left-based XY position.
            // This is because the consumer of the injected event will
            // perform its own RTL normalization.
            eventXY = event.getTrueXY();

        // the event from the inner document has XY relative to that document's origin,
        // so adjust it to use the origin of the iframe in the outer document:
        event.xy = [iframeXY[0] + eventXY[0], iframeXY[1] + eventXY[1]];

        event.injectEvent(iframeEl); // blame the iframe for the event...

        event.xy = originalEventXY; // restore the original XY (just for safety)
    },

    load: function(src) {
        let me = this,
            text = me.loadMask,
            frame = me.getFrame();

        if (me.fireEvent('beforeload', me, src) !== false) {
            if (text && me.el) {
                me.el.mask(text);
            }

            frame.src = me.src = src || me.src;
        }
    },
});

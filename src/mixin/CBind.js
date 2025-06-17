/*
 * The Proxmox CBind mixin is intended to supplement the 'bind' mechanism
 * of ExtJS. In contrast to the 'bind', 'cbind' only acts during the creation
 * of the component, not during its lifetime. It's only applied once before
 * the 'initComponent' method is executed, and thus you have only access
 * to the basic initial configuration of it.
 *
 * You can use it to get a 'declarative' approach to component declaration,
 * even when you need to set some properties of sub-components dynamically
 * (e.g., the 'nodename'). It overwrites the given properties of the 'cbind'
 * object in the component with their computed values of the computed
 * cbind configuration object of the 'cbindData' function (or object).
 *
 * The cbind syntax is inspired by ExtJS' bind syntax ('{property}'), where
 * it is possible to negate values ('{!negated}'), access sub-properties of
 * objects ('{object.property}') and even use a getter function,
 * akin to viewModel formulas ('(get) => get("prop")') to execute more
 * complicated dependencies (e.g., urls).
 *
 * The 'cbind' will be recursively applied to all properties (objects/arrays)
 * that contain an 'xtype' or 'cbind' property, but stops for a subtree if the
 * object in question does not have either (if you have one or more levels that
 * have no cbind/xtype property, you can insert empty cbind objects there to
 * reach deeper nested objects).
 *
 * This reduces the code in the 'initComponent' and instead we can statically
 * declare items, buttons, tbars, etc. while the dynamic parts are contained
 * in the 'cbind'.
 *
 * It is used like in the following example:
 *
 * Ext.define('Some.Component', {
 *     extend: 'Some.other.Component',
 *
 *     // first it has to be enabled
 *     mixins: ['Proxmox.Mixin.CBind'],
 *
 *     // then a base config has to be defined. this can be a function,
 *     // which has access to the initial config and can store persistent
 *     // properties, as well as return temporary ones (which only exist during
 *     // the cbind process)
 *     // this function will be called before 'initComponent'
 *     cbindData: function(initialconfig) {
 *         // 'this' here is the same as in 'initComponent'
 *         let me = this;
 *         me.persistentProperty = false;
 *         return {
 *             temporaryProperty: true,
 *         };
 *     },
 *
 *     // if there is no need for persistent properties, it can also simply be an object
 *     cbindData: {
 *         temporaryProperty: true,
 *         // properties itself can also be functions that will be evaluated before
 *         // replacing the values
 *         dynamicProperty: (cfg) => !cfg.temporaryProperty,
 *         numericProp: 0,
 *         objectProp: {
 *             foo: 'bar',
 *             bar: 'baz',
 *         }
 *     },
 *
 *     // you can 'cbind' the component itself, here the 'target' property
 *     // will be replaced with the content of 'temporaryProperty' (true)
 *     // before the components initComponent
 *     cbind: {
 *          target: '{temporaryProperty}',
 *     },
 *
 *     items: [
 *         {
 *             xtype: 'checkbox',
 *             cbind: {
 *                 value: '{!persistentProperty}',
 *                 object: '{objectProp.foo}'
 *                 dynamic: (get) => get('numericProp') + 1,
 *             },
 *         },
 *         {
 *             // empty cbind so that subitems are reached
 *             cbind: {},
 *             items: [
 *                 {
 *                     xtype: 'textfield',
 *                     cbind: {
 *                         value: '{objectProp.bar}',
 *                     },
 *                 },
 *             ],
 *         },
 *     ],
 * });
 */

Ext.define('Proxmox.Mixin.CBind', {
    extend: 'Ext.Mixin',

    mixinConfig: {
        before: {
            initComponent: 'cloneTemplates',
        },
    },

    cloneTemplates: function () {
        let me = this;

        if (typeof me.cbindData === 'function') {
            me.cbindData = me.cbindData(me.initialConfig);
        }
        me.cbindData = me.cbindData || {};

        let getConfigValue = function (cname) {
            if (cname in me.initialConfig) {
                return me.initialConfig[cname];
            }
            if (cname in me.cbindData) {
                let res = me.cbindData[cname];
                if (typeof res === 'function') {
                    return res(me.initialConfig);
                } else {
                    return res;
                }
            }
            if (cname in me) {
                return me[cname];
            }
            throw "unable to get cbind data for '" + cname + "'";
        };

        let applyCBind = function (obj) {
            let cbind = obj.cbind,
                cdata;
            if (!cbind) {
                return;
            }

            // biome-ignore lint/suspicious/useGuardForIn: loop over everything
            for (const prop in cbind) {
                let match, found;
                cdata = cbind[prop];

                found = false;
                if (typeof cdata === 'function') {
                    obj[prop] = cdata(getConfigValue, prop);
                    found = true;
                } else if ((match = /^\{(!)?([a-z_][a-z0-9_]*)\}$/i.exec(cdata))) {
                    let cvalue = getConfigValue(match[2]);
                    if (match[1]) {
                        cvalue = !cvalue;
                    }
                    obj[prop] = cvalue;
                    found = true;
                } else if (
                    (match = /^\{(!)?([a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)+)\}$/i.exec(cdata))
                ) {
                    let keys = match[2].split('.');
                    let cvalue = getConfigValue(keys.shift());
                    keys.forEach(function (k) {
                        if (k in cvalue) {
                            cvalue = cvalue[k];
                        } else {
                            throw "unable to get cbind data for '" + match[2] + "'";
                        }
                    });
                    if (match[1]) {
                        cvalue = !cvalue;
                    }
                    obj[prop] = cvalue;
                    found = true;
                } else {
                    obj[prop] = cdata.replace(/{([a-z_][a-z0-9_]*)\}/gi, (_match, cname) => {
                        let cvalue = getConfigValue(cname);
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

        let cloneTemplateObject;
        let cloneTemplateArray = function (org) {
            let copy, i, found, el, elcopy, arrayLength;

            arrayLength = org.length;
            found = false;
            for (i = 0; i < arrayLength; i++) {
                el = org[i];
                if (el.constructor === Object && (el.xtype || el.cbind)) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                return org; // no need to copy
            }

            copy = [];
            for (i = 0; i < arrayLength; i++) {
                el = org[i];
                if (el.constructor === Object && (el.xtype || el.cbind)) {
                    elcopy = cloneTemplateObject(el);
                    if (elcopy.cbind) {
                        applyCBind(elcopy);
                    }
                    copy.push(elcopy);
                } else if (el.constructor === Array) {
                    elcopy = cloneTemplateArray(el);
                    copy.push(elcopy);
                } else {
                    copy.push(el);
                }
            }
            return copy;
        };

        cloneTemplateObject = function (org) {
            let res = {},
                prop,
                el,
                copy;
            // biome-ignore lint/suspicious/useGuardForIn: loop over everything
            for (prop in org) {
                el = org[prop];
                if (el === undefined || el === null) {
                    res[prop] = el;
                    continue;
                }
                if (el.constructor === Object && (el.xtype || el.cbind)) {
                    copy = cloneTemplateObject(el);
                    if (copy.cbind) {
                        applyCBind(copy);
                    }
                    res[prop] = copy;
                } else if (el.constructor === Array) {
                    copy = cloneTemplateArray(el);
                    res[prop] = copy;
                } else {
                    res[prop] = el;
                }
            }
            return res;
        };

        let condCloneProperties = function () {
            let prop, el, tmp;

            // biome-ignore lint/suspicious/useGuardForIn: loop over everything
            for (prop in me) {
                el = me[prop];
                if (el === undefined || el === null) {
                    continue;
                }
                if (typeof el === 'object' && el.constructor === Object) {
                    if ((el.xtype || el.cbind) && prop !== 'config') {
                        me[prop] = cloneTemplateObject(el);
                    }
                } else if (el.constructor === Array) {
                    tmp = cloneTemplateArray(el);
                    me[prop] = tmp;
                }
            }
        };

        condCloneProperties();
    },
});

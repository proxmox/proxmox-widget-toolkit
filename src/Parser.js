// NOTE: just relays parsing to markedjs parser
Ext.define('Proxmox.Markdown', {
    alternateClassName: 'Px.Markdown', // just trying out something, do NOT copy this line
    singleton: true,

    // transforms HTML to a DOM tree and recursively descends and HTML-encodes every branch with a
    // "bad" node.type and drops "bad" attributes from the remaining nodes.
    // "bad" means anything which can do XSS or break the layout of the outer page
    sanitizeHTML: function(input) {
	if (!input) {
	    return input;
	}
	let _isHTTPLike = value => value.match(/^\s*https?:/i); // URL's protocol ends with :
	let _sanitize;
	_sanitize = (node) => {
	    if (node.nodeType === 3) return;
	    if (node.nodeType !== 1 ||
		/^(script|style|form|select|option|optgroup|map|area|canvas|textarea|applet|font|iframe|audio|video|object|embed|svg)$/i.test(node.tagName)
	    ) {
		// could do node.remove() instead, but it's nicer UX if we keep the (encoded!) html
		node.outerHTML = Ext.String.htmlEncode(node.outerHTML);
		return;
	    }
	    for (let i=node.attributes.length; i--;) {
		const name = node.attributes[i].name;
		const value = node.attributes[i].value;
		// TODO: we may want to also disallow class and id attrs
		if (
		    !/^(class|id|name|href|src|alt|align|valign|disabled|checked|start|type|target)$/i.test(name)
		) {
		    node.attributes.removeNamedItem(name);
		} else if ((name === 'href' || name === 'src') && !_isHTTPLike(value)) {
		    try {
			let url = new URL(value, window.location.origin);
			if (
			    _isHTTPLike(url.protocol) ||
			    node.tagName.toLowerCase() === 'a' ||
			    (node.tagName.toLowerCase() === 'img' && url.protocol.toLowerCase() === 'data:')
			) {
			    node.attributes[i].value = url.href;
			} else {
			    node.attributes.removeNamedItem(name);
			}
		    } catch (e) {
			node.attributes.removeNamedItem(name);
		    }
		} else if (name === 'target' && node.tagName.toLowerCase() !== 'a') {
		    node.attributes.removeNamedItem(name);
		}
	    }
	    for (let i=node.childNodes.length; i--;) _sanitize(node.childNodes[i]);
	};

	const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body>${input}`, 'text/html');
	doc.normalize();

	_sanitize(doc.body);

	return doc.body.innerHTML;
    },

    parse: function(markdown) {
	/*global marked*/
	let unsafeHTML = marked.parse(markdown);

	return `<div class="pmx-md">${this.sanitizeHTML(unsafeHTML)}</div>`;
    },

});

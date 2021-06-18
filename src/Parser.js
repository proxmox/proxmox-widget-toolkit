// NOTE: just relays parsing to markedjs parser
Ext.define('Proxmox.Markdown', {
    alternateClassName: 'Px.Markdown', // just trying out something, do NOT copy this line
    singleton: true,

    // transforms HTML to a DOM tree and recursively descends and prunes every branch with a
    // "bad" node.type and drops "bad" attributes from the remaining nodes.
    // "bad" means anything which can do XSS or break the layout of the outer page
    sanitizeHTML: function(input) {
	if (!input) {
	    return input;
	}
	let _sanitize;
	_sanitize = (node) => {
	    if (node.nodeType === 3) return;
	    if (node.nodeType !== 1 || /^(script|iframe|object|embed|svg)$/i.test(node.tagName)) {
		node.remove();
		return;
	    }
	    for (let i=node.attributes.length; i--;) {
		const name = node.attributes[i].name;
		// TODO: we may want to also disallow class and id attrs
		if (!/^(class|id|name|href|src|alt|align|valign)$/i.test(name)) {
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
	let unsafeHTML = marked(markdown);

	return `<div class="pmx-md">${this.sanitizeHTML(unsafeHTML)}</div>`;
    },

});

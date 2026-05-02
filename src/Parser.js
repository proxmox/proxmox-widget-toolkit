// NOTE: just relays parsing to markedjs parser
Ext.define('Proxmox.Markdown', {
    alternateClassName: 'Px.Markdown', // just trying out something, do NOT copy this line
    singleton: true,

    // counter to namespace `id`/`name` attributes (and same-document fragment links pointing to
    // them) per rendered note, so multiple notes on the same page cannot clobber each other.
    _instanceCounter: 0,

    // tags we explicitly allow.  Anything not on this list (incl. SVG, custom elements,
    // <plaintext>/<noscript>/<template>/<base>/<meta>/<link>/<frame*>, MathML integration
    // points like <annotation-xml>, and so on) gets HTML-encoded by the walker.  Covers what
    // marked v4 produces for GFM plus common raw-HTML patterns admins use in notes, plus a
    // curated subset of presentation MathML so admins can paste calculations into notes.
    //
    // MathML notes:
    // - <annotation-xml> and <annotation> are deliberately NOT on this list: they are the
    //   parser-mode-flipping integration points and the historical mXSS source.  Same for
    //   <semantics> (its only purpose is to wrap annotations) and <mlabeledtr>.
    // - <mglyph> and <maction> are NOT on this list: they can load external resources via
    //   `src`/`xlink:href`/`actiontype=link` which would bypass our HTML-style URL allowlist.
    _allowedTags: new Set([
        // structural; `html` and `body` are kept since DOMParser always wraps the input in them
        // and we walk doc.body itself.
        'html', 'body',
        // HTML
        'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo', 'blockquote', 'br',
        'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl',
        'dt', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
        'hr', 'i', 'img', 'input', 'ins', 'kbd', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre',
        'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'small', 'span', 'strong', 'sub',
        'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul',
        'var', 'wbr',
        // MathML (presentation only; integration-point and URL-loading elements left out above)
        'math', 'merror', 'mfenced', 'mfrac', 'mi', 'mmultiscripts', 'mn', 'mo', 'mover',
        'mpadded', 'mphantom', 'mprescripts', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle',
        'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover',
        'menclose',
    ]),

    // attributes we keep on allowed elements.  Anything else is dropped.  `id`/`name` are
    // handled specially (namespaced) and so are NOT in this list -- they fall through to the
    // dedicated branch.  Includes MathML presentation attributes; none of these take URL values
    // so the URL-validation branch (href/src) doesn't need to know about them.  `form` is
    // deliberately omitted: as an HTML attribute it associates an <input> with a form by id and
    // would defeat our id namespacing.
    _allowedAttrRE: new RegExp(
        '^(?:'
        // common HTML
        + 'class|href|src|alt|align|valign|disabled|checked|start|type|target|colspan|rowspan'
        + '|title|width|height|dir'
        // MathML presentation attributes
        + '|mathvariant|mathsize|mathcolor|mathbackground|displaystyle|scriptlevel|display'
        + '|accent|accentunder|lspace|rspace|linethickness|maxsize|minsize|movablelimits|stretchy'
        + '|symmetric|notation|subscriptshift|superscriptshift|depth|fence|separator'
        + '|columnalign|columnlines|columnspacing|rowalign|rowlines|rowspacing|frame|framespacing'
        + '|open|close|separators'
        + ')$',
        'i',
    ),

    // explicitly denied URL schemes for href/src.  An attribute with one of these gets dropped.
    // We keep the original "permissive" stance for <a> (commit 5cbbb9c, allow RDP/SSH/VNC/etc.
    // shortcuts) so we don't regress legitimate admin links, but extend the deny list past
    // just `javascript:`.
    _deniedSchemes: new Set([
        'javascript:', 'vbscript:', 'livescript:', 'mocha:', 'data:', 'jar:',
    ]),

    // the data: subset we allow on <img src> -- raster images only.  Keeps SVG-via-data: out
    // (defense in depth: even though browsers don't run scripts in img-loaded SVG today, this
    // also rules out content-sniffing surprises).
    _imgDataMimeRE: /^\s*data:image\/(?:png|gif|jpeg|jpg|webp|x-icon|vnd\.microsoft\.icon|bmp);/i,

    // transforms HTML to a DOM tree and recursively descends.  Elements not on the allowlist are
    // HTML-encoded; on allowed elements, attributes not on the allowlist get dropped.  href/src
    // are URL-validated; id/name (and same-document fragment hrefs) are rewritten with a
    // per-render prefix to prevent DOM clobbering.
    sanitizeHTML: function (input, prefix) {
        if (!input) {
            return input;
        }
        prefix = prefix || '';

        let me = this;

        // rewrite a same-document fragment-only href: `#foo` -> `#${prefix}foo`.  Cross-document
        // anchors (`https://x/y#foo`) are left alone since their fragment refers to that other
        // document.  Returns null if the value is not a same-document fragment.
        let _rewriteFragment = (value) => {
            let m = /^\s*#(.*)$/s.exec(value);
            if (!m) {
                return null;
            }
            return `#${prefix}${m[1]}`;
        };

        let _replaceWithEncoded = (node) => {
            // safer than `outerHTML = htmlEncode(outerHTML)` because we never round-trip through
            // the parser -- a text node literally cannot turn back into HTML.
            let text = node.ownerDocument.createTextNode(node.outerHTML);
            node.replaceWith(text);
        };

        let _validateUrl = (tagName, attrName, value) => {
            // returns the resolved URL string if safe, or `null` to indicate the attribute
            // should be dropped.

            // same-document fragment: namespace it so it points at our rewritten id/name.
            let frag = _rewriteFragment(value);
            if (frag !== null) {
                return frag;
            }

            let url;
            try {
                url = new URL(value, window.location.origin);
            } catch (_e) {
                return null;
            }
            const protocol = url.protocol.toLowerCase();

            if (me._deniedSchemes.has(protocol)) {
                // <img src="data:image/...,..."> is the one carve-out.
                if (
                    tagName === 'img'
                    && attrName === 'src'
                    && me._imgDataMimeRE.test(value)
                ) {
                    return url.href;
                }
                return null;
            }

            if (tagName === 'img' || tagName === 'input') {
                // resource-loading tags must use http(s); no exotic protocol handlers.
                if (protocol === 'http:' || protocol === 'https:') {
                    return url.href;
                }
                return null;
            }
            if (tagName === 'a') {
                // <a> keeps the broad behaviour (commit 5cbbb9c) so admins can use shortcuts
                // like rdp:, ssh:, vnc:, mailto:, tel:, etc.; only the explicit denylist above
                // is rejected.
                return url.href;
            }
            // any other tag with href/src (e.g. unexpected ones that survive the allowlist)
            // -> require http(s).
            if (protocol === 'http:' || protocol === 'https:') {
                return url.href;
            }
            return null;
        };

        let _sanitize;
        _sanitize = (node) => {
            if (node.nodeType === 3) { // Text
                return;
            }
            if (node.nodeType !== 1) { // not Element (Comment, CDATA, PI, ...)
                if (typeof node.remove === 'function') {
                    node.remove();
                }
                return;
            }
            const tagName = node.tagName.toLowerCase();
            if (!me._allowedTags.has(tagName)) {
                _replaceWithEncoded(node);
                return;
            }

            // snapshot attributes; we mutate the live NamedNodeMap below.
            const attrs = Array.from(node.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                const value = attr.value;

                if (name === 'id' || name === 'name') {
                    // namespace these to prevent DOM clobbering of surrounding framework code.
                    if (value && /\S/.test(value)) {
                        node.setAttribute(name, `${prefix}${value}`);
                    } else {
                        node.removeAttribute(attr.name);
                    }
                    continue;
                }
                if (!me._allowedAttrRE.test(name)) {
                    node.removeAttribute(attr.name);
                    continue;
                }
                if (name === 'href' || name === 'src') {
                    let resolved = _validateUrl(tagName, name, value);
                    if (resolved === null) {
                        node.removeAttribute(attr.name);
                    } else {
                        node.setAttribute(attr.name, resolved);
                    }
                    continue;
                }
                if (name === 'target') {
                    if (tagName !== 'a') {
                        node.removeAttribute(attr.name);
                        continue;
                    }
                    // restrict target to a small known-safe set.  In particular only `_blank`
                    // is useful in a notes context; `_top`/`_parent` could break out of the
                    // surrounding admin UI.  Anything else gets stripped.
                    let v = value.trim().toLowerCase();
                    if (v === '_blank') {
                        node.setAttribute(attr.name, '_blank');
                        // force rel=noopener noreferrer; modern browsers default to it for
                        // _blank but older ones don't, and we want to suppress the Referer too.
                        node.setAttribute('rel', 'noopener noreferrer');
                    } else {
                        node.removeAttribute(attr.name);
                    }
                    continue;
                }
            }

            // snapshot children too: we replace nodes during recursion.
            const children = Array.from(node.childNodes);
            for (let i = children.length - 1; i >= 0; i--) {
                _sanitize(children[i]);
            }
        };

        const doc = new DOMParser().parseFromString(
            `<!DOCTYPE html><html><body>${input}`,
            'text/html',
        );
        doc.normalize();

        _sanitize(doc.body);

        return doc.body.innerHTML;
    },

    parse: function (markdown) {
        /*global marked*/
        // pin marked v4 options explicitly so a future package bump (incl. defaults flipping)
        // does not change behaviour.  `headerIds: true` keeps marked's auto-generated heading
        // anchors so `[link](#section)` still works -- the sanitizer namespaces both the id and
        // the matching fragment href below to defuse DOM clobbering.
        let unsafeHTML = marked.parse(markdown, {
            gfm: true,
            breaks: false,
            headerIds: true,
            mangle: true,
        });

        this._instanceCounter += 1;
        let prefix = `pmx-md-${this._instanceCounter}-`;

        return `<div class="pmx-md">${this.sanitizeHTML(unsafeHTML, prefix)}</div>`;
    },
});

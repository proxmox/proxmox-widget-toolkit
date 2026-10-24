Ext.define('Proxmox.window.PackageChangelogRenderer', {
    singleton: true,
    // urgencies worth pointing out, the usual ones are low and medium
    urgentUrgencies: ['high', 'critical', 'emergency'],

    renderEntries: function (entries) {
        return entries.map(Proxmox.window.PackageChangelogRenderer.renderEntry).join('');
    },

    renderEntry: function (entry) {
        let me = Proxmox.window.PackageChangelogRenderer;
        let header = `<span class="pmx-changelog-version">${Ext.htmlEncode(entry.version)}</span>`;
        for (const distribution of entry.distributions.split(/\s+/)) {
            header += `<span class="pmx-changelog-tag">${Ext.htmlEncode(distribution)}</span>`;
        }
        let urgency = entry.urgency?.toLowerCase();
        if (me.urgentUrgencies.includes(urgency)) {
            header +=
                '<span class="pmx-changelog-tag pmx-changelog-urgent">' +
                `${Ext.String.format(gettext('urgency {0}'), Ext.htmlEncode(urgency))}</span>`;
        }

        let meta = [];
        let [, name, email] = entry.maintainer?.match(/^(.*?)\s*<(.*)>$/) ?? [];
        if (name || entry.maintainer) {
            let qtip = email ? ` data-qtip="${Ext.htmlEncode(Ext.htmlEncode(email))}"` : '';
            meta.push(`<span${qtip}>${Ext.htmlEncode(name || entry.maintainer)}</span>`);
        }
        if (entry.date) {
            let date = new Date(entry.date);
            let text = Number.isNaN(date.getTime())
                ? entry.date
                : Ext.Date.format(date, 'Y-m-d H:i');
            let qtip = Ext.htmlEncode(Ext.htmlEncode(entry.date));
            meta.push(`<span data-qtip="${qtip}">${Ext.htmlEncode(text)}</span>`);
        }
        header += `<span class="pmx-changelog-meta">${meta.join(' &middot; ')}</span>`;

        let proxmox = !!entry.maintainer?.includes('@proxmox.com');
        let changes;
        try {
            changes = me.renderChanges(entry.changes, proxmox);
        } catch (_err) {
            // rather show unusual changes as they are written than not at all
            changes = `<div class="pmx-changelog-text">${Ext.htmlEncode(entry.changes)}</div>`;
        }
        return (
            '<div class="pmx-changelog-entry">' +
            `<div class="pmx-changelog-entry-header">${header}</div>` +
            changes +
            '</div>'
        );
    },

    // renders the changes of an entry, usually lists marked with '*' and nested ones marked
    // with '-' or '+', with continuation lines indented further, and sections per author like
    // '[ Some One ]' for entries combining the work of several people. Other text keeps its
    // line breaks, as it can be an example of output or configuration.
    renderChanges: function (changes, proxmox) {
        let me = Proxmox.window.PackageChangelogRenderer;
        let root = { kind: 'root', indent: -1, children: [] };
        // the open list items, by the indentation of their marker
        let stack = [root];
        // the node that continuation lines get added to
        let current;
        for (const line of changes.split('\n')) {
            let indent = line.search(/\S/);
            if (indent < 0) {
                // paragraphs end at a blank line, list items get a new paragraph after one
                if (current) {
                    current.ended = true;
                }
                continue;
            }
            let bullet = line.match(/^\s*[*+-]\s+(\S.*)$/);
            let author = indent <= 2 && line.match(/^\s*\[\s*([^\]]*?\S)\s*\]\s*$/);
            if (author) {
                stack = [root];
                root.children.push({ kind: 'author', name: author[1] });
                current = undefined;
                continue;
            }
            while (stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }
            let parent = stack[stack.length - 1];
            if (bullet) {
                current = { kind: 'item', indent, text: bullet[1].trim(), children: [] };
                parent.children.push(current);
                stack.push(current);
            } else if (current?.kind === 'item' && current === parent && !current.ended) {
                current.text += ` ${line.trim()}`;
            } else if (
                current?.kind === 'paragraph' &&
                current.parent === parent &&
                indent >= current.indent &&
                !current.ended
            ) {
                current.lines.push(line.slice(current.indent).trimEnd());
            } else {
                current = { kind: 'paragraph', indent, parent, lines: [line.trim()] };
                parent.children.push(current);
            }
        }

        let render = function (children) {
            let html = '';
            let inList = false;
            for (const child of children) {
                if (child.kind === 'item') {
                    if (!inList) {
                        html += '<ul class="pmx-changelog-changes">';
                        inList = true;
                    }
                    html += `<li>${me.renderText(child.text, proxmox)}${render(child.children)}</li>`;
                    continue;
                }
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (child.kind === 'author') {
                    html += `<div class="pmx-changelog-author">${Ext.htmlEncode(child.name)}</div>`;
                } else {
                    let text = me.renderText(child.lines.join('\n'), proxmox);
                    html += `<div class="pmx-changelog-text">${text}</div>`;
                }
            }
            return inList ? `${html}</ul>` : html;
        };
        return render(root.children);
    },

    // escapes text and links CVE IDs, Debian bugs closed by an upload and, for Proxmox
    // packages, the Bugzilla entries they fix
    renderText: function (text, proxmox) {
        let link = (url, label) =>
            `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        let html = Ext.htmlEncode(text)
            .replace(/\bCVE-\d{4}-\d{4,}\b/g, (cve) =>
                link(`https://security-tracker.debian.org/tracker/${cve}`, cve),
            )
            .replace(/\bcloses:\s*(?:bug)?#\d+(?:\s*,\s*(?:bug)?#\d+)*/gi, (closes) =>
                closes.replace(/#(\d+)/g, (bug, id) => link(`https://bugs.debian.org/${id}`, bug)),
            );
        if (proxmox) {
            html = html.replace(/\bfix(?:es)?\s+#(\d+)/gi, (fix, id) =>
                link(`https://bugzilla.proxmox.com/show_bug.cgi?id=${id}`, fix),
            );
        }
        return html;
    },
});

// shows the changelog that an installed package ships, limited to the versions later than
// sinceVersion up to including toVersion, like for an upgrade from the former to the latter
Ext.define('Proxmox.window.PackageChangelog', {
    extend: 'Ext.window.Window',
    alias: 'widget.proxmoxPackageChangelog',

    width: 800,
    height: 600,
    layout: 'fit',
    modal: true,

    nodename: undefined,
    packageName: undefined,
    sinceVersion: undefined,
    toVersion: undefined,

    initComponent: function () {
        let me = this;

        if (!me.nodename) {
            throw 'no node name specified';
        }
        if (!me.packageName) {
            throw 'no package name specified';
        }

        let url = `/nodes/${me.nodename}/apt/installed-changelog`;

        // big changelogs get shown in parts, rendering a few MiB of changes takes a while
        let firstPartSize = 256 * 1024;
        let entries = [];
        let note = '';

        let firstPart = function () {
            let count = 0;
            let size = 0;
            while (count < entries.length && (count === 0 || size < firstPartSize)) {
                size += entries[count++].changes.length;
            }
            return count;
        };

        let showEntries = function (count) {
            let html =
                note +
                Proxmox.window.PackageChangelogRenderer.renderEntries(entries.slice(0, count));
            if (count < entries.length) {
                let text = Ext.String.format(
                    ngettext('Show all {0} entry', 'Show all {0} entries', entries.length),
                    entries.length,
                );
                html += `<a class="pmx-changelog-more" href="#">${text}</a>`;
            }
            view.update(html);
        };

        let view = Ext.create('Ext.Component', {
            cls: 'pmx-changelog',
            scrollable: true,
            listeners: {
                afterrender: (cmp) =>
                    cmp.getEl().on('click', (event) => {
                        if (event.getTarget('.pmx-changelog-more')) {
                            event.preventDefault();
                            showEntries(entries.length);
                        }
                    }),
            },
        });

        // all entries, for selecting from their versions, only loaded once that is wanted
        let versionStore = Ext.create('Ext.data.Store', {
            fields: [
                'date',
                {
                    name: 'day',
                    calculate: (data) => {
                        let date = new Date(data.date);
                        return Number.isNaN(date.getTime()) ? '' : Ext.Date.format(date, 'Y-m-d');
                    },
                },
            ],
            proxy: {
                type: 'proxmox',
                url: `/api2/json${url}`,
                extraParams: { name: me.packageName },
            },
        });

        let load = function () {
            let params = { name: me.packageName };
            let since = sinceField.getValue()?.trim();
            if (since) {
                params['since-version'] = since;
            }
            let to = toField.getValue()?.trim();
            if (to) {
                params['to-version'] = to;
            }
            Proxmox.node.APTUtils.loadInto(
                view,
                url,
                params,
                (response) => {
                    entries = response.result.data;
                    note = '';
                    // without an entry for the version, the newest entry is the only one
                    if (to && entries.length && !entries.some((entry) => entry.version === to)) {
                        let text = Ext.String.format(
                            gettext(
                                'The changelog does not list version {0}, so only its newest entry is shown.',
                            ),
                            to,
                        );
                        note = `<p>${Ext.htmlEncode(text)}</p>`;
                    }
                    if (entries.length) {
                        showEntries(firstPart());
                    } else {
                        view.update(Proxmox.node.APTUtils.emptyChangelogText);
                    }
                    view.scrollTo(0, 0);
                },
                (response) =>
                    view.update(
                        response.result?.status === 404
                            ? gettext(
                                  'No changelog available. The package is not installed or was installed without its documentation.',
                              )
                            : response.htmlStatus,
                    ),
            );
        };

        let versionField = (label, value, emptyText) =>
            Ext.create('Ext.form.field.ComboBox', {
                fieldLabel: label,
                labelWidth: 35,
                width: 280,
                value,
                emptyText,
                store: versionStore,
                queryMode: 'local',
                valueField: 'version',
                displayField: 'version',
                anyMatch: true,
                listConfig: {
                    itemTpl: '{version:htmlEncode}<span class="pmx-changelog-date">{day}</span>',
                    // also lets the list expand before its versions are loaded
                    emptyText: gettext('No matching versions'),
                },
                triggers: {
                    clear: Proxmox.node.APTUtils.clearTrigger(value),
                },
                listeners: {
                    expand: (field) => {
                        if (!versionStore.isLoaded() && !versionStore.isLoading()) {
                            versionStore.load({
                                // the list closes when the loaded versions include the value
                                callback: () => {
                                    if (!field.destroyed && field.hasFocus && !field.isExpanded) {
                                        field.expand();
                                    }
                                },
                            });
                        }
                    },
                    change: {
                        fn: (field, newValue) => {
                            Proxmox.node.APTUtils.toggleClearTrigger(field, newValue);
                            load();
                        },
                        buffer: 300,
                    },
                },
            });
        let sinceField = versionField(gettext('From'), me.sinceVersion, gettext('Oldest'));
        let toField = versionField(gettext('To'), me.toVersion, gettext('Newest'));

        Ext.apply(me, {
            title: `${gettext('Changelog')}: ${Ext.htmlEncode(me.packageName)}`,
            tbar: [sinceField, toField],
            items: [view],
            listeners: {
                // after rendering, for showing a load mask
                afterrender: () => load(),
            },
        });

        me.callParent();
    },
});

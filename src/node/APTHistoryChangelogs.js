Ext.define('Proxmox.node.APTHistoryChangelogs', {
    extend: 'Proxmox.node.APTHistoryDetail',
    xtype: 'proxmoxNodeAPTHistoryChangelogs',

    title: gettext('Changelogs'),
    path: 'transaction-changelogs',
    bodyCls: 'pmx-apt-history-changelogs',
    emptyChangelogText: Proxmox.node.APTUtils.emptyChangelogText,

    setGroupsOpen: function (open) {
        for (const details of this.body.dom.querySelectorAll('details')) {
            details.open = open;
        }
    },

    renderEntries: function (group) {
        // the summary line only has room for the start of an error
        if (group.error) {
            return Ext.htmlEncode(group.error);
        }
        if (!group.source) {
            return '';
        }
        if (!group.entries.length) {
            return this.emptyChangelogText;
        }
        let html = Proxmox.window.PackageChangelogRenderer.renderEntries(group.entries);
        if (group['unlisted-version']) {
            let note = gettext(
                'The changelog does not list the package version, so only its newest entry is shown.',
            );
            html = `<p>${Ext.htmlEncode(note)}</p>${html}`;
        }
        return html;
    },

    renderData: function (groups) {
        this.groups = groups;
        let html = groups
            .map((group, id) => {
                // the binary packages of a source can change between different versions, for
                // example with binary-only uploads, show each change between versions once
                let transitions = new Set(group.packages.map(Proxmox.node.APTUtils.versionsText));
                let versions = Ext.htmlEncode([...transitions].join(' / '));
                let name = group.source ?? group.packages[0].package;
                let others = new Set(
                    group.packages.map((change) => change.package).filter((pkg) => pkg !== name),
                );
                let othersText = Ext.htmlEncode([...others].join(', '));
                let meta;
                let metaCls = 'pmx-apt-history-changelogs-meta';
                let metaTip = '';
                if (group.error) {
                    meta = Ext.htmlEncode(group.error);
                    metaCls += ' pmx-apt-history-changelogs-error';
                    metaTip = ` data-qtip="${Ext.htmlEncode(meta)}"`;
                } else if (!group.source) {
                    meta = gettext('No changelog installed');
                } else {
                    let count = group.entries.length;
                    meta = Ext.String.format(ngettext('{0} entry', '{0} entries', count), count);
                }
                return (
                    `<details data-id="${id}">` +
                    '<summary><i class="fa fa-fw fa-caret-right"></i>' +
                    `<span class="pmx-apt-history-changelogs-name">${Ext.htmlEncode(name)}</span>` +
                    `<span class="pmx-apt-history-changelogs-versions">${versions}</span>` +
                    `<span class="pmx-apt-history-changelogs-binaries" data-qtip="${Ext.htmlEncode(
                        othersText,
                    )}">${othersText}</span>` +
                    `<span class="${metaCls}"${metaTip}>${meta}</span>` +
                    '</summary>' +
                    '<div class="pmx-apt-history-changelogs-entries"></div>' +
                    '</details>'
                );
            })
            .join('');
        return html || gettext('No package changes with a changelog.');
    },

    afterRender: function () {
        let me = this;
        me.callParent();
        // the toggle event does not bubble
        me.body.on(
            'toggle',
            (event) => {
                let details = event.target;
                let group = me.groups?.[Number(details.dataset.id)];
                let body = details.querySelector('.pmx-apt-history-changelogs-entries');
                if (details.open && group && body && !body.innerHTML) {
                    body.innerHTML = me.renderEntries(group);
                }
            },
            me,
            { capture: true, delegated: false },
        );
    },

    initComponent: function () {
        let me = this;
        me.tbar = [
            {
                text: gettext('Expand All'),
                iconCls: 'fa fa-plus-square-o',
                handler: () => me.setGroupsOpen(true),
            },
            {
                text: gettext('Collapse All'),
                iconCls: 'fa fa-minus-square-o',
                handler: () => me.setGroupsOpen(false),
            },
        ];
        me.callParent();
    },
});

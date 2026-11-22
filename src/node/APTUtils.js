Ext.define('Proxmox.node.APTUtils', {
    singleton: true,

    selectTransactionText: gettext('Select a transaction to see its details.'),
    emptyChangelogText: gettext(
        'No changelog entries for these versions. The installed changelog only covers the installed version and older ones.',
    ),

    clearTrigger: (value) => ({
        cls: 'pmx-clear-trigger',
        weight: -1,
        hidden: Ext.isEmpty(value),
        handler: function () {
            this.setValue(null);
        },
    }),

    toggleClearTrigger: (field, value) => field.getTrigger('clear').setVisible(!Ext.isEmpty(value)),

    // in the order APT logs them
    actions: {
        install: {
            text: gettext('Install'),
            summary: (n) => ngettext('{0} installed', '{0} installed', n),
        },
        reinstall: {
            text: gettext('Reinstall'),
            summary: (n) => ngettext('{0} reinstalled', '{0} reinstalled', n),
        },
        upgrade: {
            text: gettext('Upgrade'),
            summary: (n) => ngettext('{0} upgraded', '{0} upgraded', n),
        },
        downgrade: {
            text: gettext('Downgrade'),
            summary: (n) => ngettext('{0} downgraded', '{0} downgraded', n),
        },
        remove: {
            text: gettext('Remove'),
            summary: (n) => ngettext('{0} removed', '{0} removed', n),
        },
        purge: {
            text: gettext('Purge'),
            summary: (n) => ngettext('{0} purged', '{0} purged', n),
        },
        disappear: {
            text: gettext('Disappear'),
            summary: (n) => ngettext('{0} disappeared', '{0} disappeared', n),
        },
    },

    renderAction: function (action) {
        return Proxmox.node.APTUtils.actions[action]?.text ?? Ext.htmlEncode(action);
    },

    renderChanges: function (packages) {
        let H = Proxmox.node.APTUtils;
        let counts = {};
        for (const { action } of packages ?? []) {
            counts[action] = (counts[action] ?? 0) + 1;
        }
        let summaries = Object.entries(H.actions)
            .filter(([action]) => counts[action])
            .map(([action, { summary }]) =>
                Ext.String.format(summary(counts[action]), counts[action]),
            );
        return [...H.releaseChanges(packages), ...summaries].join(', ');
    },

    // packages whose major version is the major release of what they belong to
    releasePackages: new Map([
        ['base-files', 'Debian'],
        ['ceph-base', 'Ceph'],
    ]),

    releaseChanges: function (packages) {
        let major = (version) => parseInt(version?.replace(/^\d+:/, ''), 10);
        return (packages ?? []).flatMap((change) => {
            let name = Proxmox.node.APTUtils.releasePackages.get(change.package);
            let from = major(change['old-version']);
            let to = major(change['new-version']);
            return name && Number.isInteger(from) && Number.isInteger(to) && from !== to
                ? [`${name} ${from} → ${to}`]
                : [];
        });
    },

    versionsText: function (change) {
        let oldVersion = change['old-version'];
        let newVersion = change['new-version'];
        return oldVersion && newVersion && oldVersion !== newVersion
            ? `${oldVersion} → ${newVersion}`
            : (newVersion ?? oldVersion ?? '');
    },

    // one line per change, for sharing them as plain text, in ASCII so that it survives any channel
    // and can be searched for
    changesAsText: function (changes) {
        let counts = new Map();
        for (const change of changes) {
            counts.set(change.package, (counts.get(change.package) ?? 0) + 1);
        }
        return changes
            .map((change) => {
                // multiarch packages can change for several architectures at once
                let name =
                    counts.get(change.package) > 1 && change.arch
                        ? `${change.package}:${change.arch}`
                        : change.package;
                let oldVersion = change['old-version'];
                let newVersion = change['new-version'];
                let versions =
                    oldVersion && newVersion && oldVersion !== newVersion
                        ? `${oldVersion} -> ${newVersion}`
                        : newVersion || oldVersion;
                let line = versions ? `${name}: ${versions}` : name;
                return change.action === 'upgrade' ? `${line}\n` : `${line} (${change.action})\n`;
            })
            .join('');
    },

    // the log only has one second resolution, and local time, so a transaction can end before
    // it started if the clock was set back
    durationText: function (data) {
        if (data.duration < 0) {
            return data['end-time'] === undefined ? '-' : Proxmox.Utils.unknownText;
        }
        return data.duration < 1 ? '<1s' : Proxmox.Utils.format_duration_human(data.duration);
    },

    statusHtml: function (data) {
        if (data.error) {
            return `<i class="fa fa-times critical"></i> ${Ext.htmlEncode(data.error)}`;
        }
        if (data['end-time'] === undefined) {
            return `<i class="fa fa-exclamation warning"></i> ${gettext('Interrupted or still running')}`;
        }
        return `<i class="fa fa-check good"></i> ${gettext('OK')}`;
    },

    renderDuration: (_value, _meta, record) => Proxmox.node.APTUtils.durationText(record.data),

    renderStatus: function (_value, meta, record) {
        if (record.data.error) {
            meta.tdAttr = `data-qtip="${Ext.htmlEncode(Ext.htmlEncode(record.data.error))}"`;
        }
        return Proxmox.node.APTUtils.statusHtml(record.data);
    },

    renderWithTooltip: function (value, meta) {
        if (!value) {
            return '';
        }
        let text = Ext.htmlEncode(value);
        meta.tdAttr = `data-qtip="${Ext.htmlEncode(text)}"`;
        return text;
    },

    // loads data while masking the component, only the latest request of it gets handled
    loadInto: function (cmp, url, params, onSuccess, onFailure) {
        let request = (cmp.request = (cmp.request ?? 0) + 1);
        cmp.setLoading(gettext('Please wait...'));
        Proxmox.Utils.API2Request({
            url,
            params,
            method: 'GET',
            callback: (_options, success, response) => {
                if (!cmp.destroyed && request === cmp.request) {
                    cmp.setLoading(false);
                    (success ? onSuccess : onFailure)(response);
                }
            },
        });
    },

    // the styles the API keeps in the terminal output, by SGR parameter
    termLogStyles: {
        1: 'bold',
        2: 'dim',
        31: 'red',
        32: 'green',
        33: 'yellow',
        34: 'blue',
        35: 'magenta',
        36: 'cyan',
    },

    // renders styled terminal output, in which each escape sequence sets the complete style
    renderTermLog: function (output) {
        let html = '';
        let cls = '';
        // biome-ignore lint/suspicious/noControlCharactersInRegex: SGR sequences start with ESC
        for (const [i, part] of output.split(/\u001b\[([0-9;]*)m/).entries()) {
            if (i % 2) {
                cls = part
                    .split(';')
                    .map((param) => Proxmox.node.APTUtils.termLogStyles[param])
                    .filter((style) => style)
                    .map((style) => `pmx-termlog-${style}`)
                    .join(' ');
            } else if (part) {
                let text = Ext.htmlEncode(part);
                html += cls ? `<span class="${cls}">${text}</span>` : text;
            }
        }
        return html;
    },
});

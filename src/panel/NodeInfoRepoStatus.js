Ext.define('Proxmox.widget.NodeInfoRepoStatus', {
    extend: 'Proxmox.widget.Info',
    alias: 'widget.pmxNodeInfoRepoStatus',

    title: gettext('Repository Status'),

    colspan: 2,

    printBar: false,

    product: undefined,
    repoLink: undefined,

    viewModel: {
        data: {
            subscriptionActive: '',
            noSubscriptionRepo: '',
            enterpriseRepo: '',
            testRepo: '',
        },

        formulas: {
            repoStatus: function (get) {
                if (get('subscriptionActive') === '' || get('enterpriseRepo') === '') {
                    return '';
                }

                if (get('noSubscriptionRepo') || get('testRepo')) {
                    return 'non-production';
                } else if (get('subscriptionActive') && get('enterpriseRepo')) {
                    return 'ok';
                } else if (!get('subscriptionActive') && get('enterpriseRepo')) {
                    return 'no-sub';
                } else if (
                    !get('enterpriseRepo') ||
                    !get('noSubscriptionRepo') ||
                    !get('testRepo')
                ) {
                    return 'no-repo';
                }
                return 'unknown';
            },

            repoStatusMessage: function (get) {
                let me = this;
                let view = me.getView();

                const status = get('repoStatus');

                let repoLink = ` <a data-qtip="${gettext('Open Repositories Panel')}"
		    href="${view.repoLink}">
		    <i class="fa black fa-chevron-right txt-shadow-hover"></i>
		    </a>`;

                return Proxmox.Utils.formatNodeRepoStatus(status, view.product) + repoLink;
            },
        },
    },

    setValue: function (value) {
        // for binding below
        this.updateValue(value);
    },

    bind: {
        value: '{repoStatusMessage}',
    },

    setRepositoryInfo: function (standardRepos) {
        let me = this;
        let vm = me.getViewModel();

        for (const standardRepo of standardRepos) {
            const handle = standardRepo.handle;
            const status = standardRepo.status || 0;

            if (handle === 'enterprise') {
                vm.set('enterpriseRepo', status);
            } else if (handle === 'no-subscription') {
                vm.set('noSubscriptionRepo', status);
            } else if (handle === 'test') {
                vm.set('testRepo', status);
            }
        }
    },

    setSubscriptionStatus: function (status) {
        let me = this;
        let vm = me.getViewModel();

        vm.set('subscriptionActive', status);
    },

    initComponent: function () {
        let me = this;

        if (me.product === undefined) {
            throw 'no product name provided';
        }

        if (me.repoLink === undefined) {
            throw 'no repo link href provided';
        }

        me.callParent();
    },
});

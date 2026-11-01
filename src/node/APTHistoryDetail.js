Ext.define('Proxmox.node.APTHistoryDetail', {
    extend: 'Ext.panel.Panel',
    xtype: 'proxmoxNodeAPTHistoryDetail',

    border: false,
    // keeps the content directly in the body, the default layout wraps it in a table that grows
    // with long lines instead of letting them wrap or truncate
    layout: 'fit',
    scrollable: true,
    nodename: undefined,
    path: undefined,
    extraParams: undefined,
    transactionRequired: true,
    request: 0,

    renderData: (data) => Ext.htmlEncode(data),

    setTransaction: function (rec, reload) {
        let me = this;
        if (reload || rec?.getId() !== me.transaction?.getId()) {
            me.request++;
            me.loadedId = undefined;
            me.setLoading(false);
            me.update('');
        }
        me.transaction = rec;
        me.load();
    },

    load: function () {
        let me = this;
        let rec = me.transaction;
        let id = me.transactionRequired ? rec?.getId() : me.path;
        if (
            !me.rendered ||
            me.disabled ||
            (me.transactionRequired && (!rec || me.up('tabpanel').getActiveTab() !== me)) ||
            id === me.loadedId
        ) {
            return;
        }
        me.loadedId = id;
        let params = { ...me.extraParams };
        if (me.transactionRequired) {
            params['start-time'] = rec.data['start-time'];
            params['start-index'] = rec.data['start-index'];
        }
        me.update('');
        Proxmox.node.APTUtils.loadInto(
            me,
            `/nodes/${me.nodename}/apt/${me.path}`,
            params,
            (response) => {
                me.update(me.renderData(response.result.data));
                me.scrollTo(0, 0);
            },
            (response) => {
                me.update(response.htmlStatus);
                // try again when coming back
                me.loadedId = undefined;
            },
        );
    },

    listeners: {
        activate: (cmp) => cmp.load(),
        afterrender: (cmp) => cmp.load(),
    },
});

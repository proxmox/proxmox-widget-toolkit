// Pop-up a message window where the user has to manually enter the resource ID to enable the
// destroy confirmation button to ensure that they got the correct resource selected for.
Ext.define('Proxmox.window.SafeDestroy', {
    extend: 'Proxmox.window.ConfirmRemoveDialog',
    alias: 'widget.proxmoxSafeDestroy',

    dangerous: true,

    confirmButtonText: gettext('Remove'),
    // second button will only be displayed if a text is given
    declineButtonText: undefined,

    config: {
        item: {
            id: undefined,
            formattedIdentifier: undefined,
        },
        taskName: undefined,
    },

    getText: function () {
        let me = this;

        let identifier = me.getItem().formattedIdentifier ?? me.getItem().id;
        me.text = `${Proxmox.Utils.format_task_description(me.getTaskName(), identifier)}`;

        return me.callParent();
    },
});

Ext.define('Proxmox.form.RRDTypeSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: ['widget.proxmoxRRDTypeSelector'],

    displayField: 'text',
    valueField: 'id',
    editable: false,
    queryMode: 'local',
    value: 'hour',
    stateEvents: ['select'],
    stateful: true,
    stateId: 'proxmoxRRDTypeSelection',
    store: {
	type: 'array',
	fields: ['id', 'timeframe', 'cf', 'text'],
	data: [
	    ['hour', 'hour', 'AVERAGE',
	      gettext('Hour') + ' (' + gettext('average') +')'],
	    ['hourmax', 'hour', 'MAX',
	      gettext('Hour') + ' (' + gettext('maximum') + ')'],
	    ['day', 'day', 'AVERAGE',
	      gettext('Day') + ' (' + gettext('average') + ')'],
	    ['daymax', 'day', 'MAX',
	      gettext('Day') + ' (' + gettext('maximum') + ')'],
	    ['week', 'week', 'AVERAGE',
	      gettext('Week') + ' (' + gettext('average') + ')'],
	    ['weekmax', 'week', 'MAX',
	      gettext('Week') + ' (' + gettext('maximum') + ')'],
	    ['month', 'month', 'AVERAGE',
	      gettext('Month') + ' (' + gettext('average') + ')'],
	    ['monthmax', 'month', 'MAX',
	      gettext('Month') + ' (' + gettext('maximum') + ')'],
	    ['year', 'year', 'AVERAGE',
	      gettext('Year') + ' (' + gettext('average') + ')'],
	    ['yearmax', 'year', 'MAX',
	      gettext('Year') + ' (' + gettext('maximum') + ')'],
	],
    },
    // save current selection in the state Provider so RRDView can read it
    getState: function() {
	var ind = this.getStore().findExact('id', this.getValue());
	var rec = this.getStore().getAt(ind);
	if (!rec) {
	    return;
	}
	return {
	    id: rec.data.id,
	    timeframe: rec.data.timeframe,
	    cf: rec.data.cf,
	};
    },
    // set selection based on last saved state
    applyState: function(state) {
	if (state && state.id) {
	    this.setValue(state.id);
	}
    },
});

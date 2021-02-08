include defines.mk

SUBDIRS= css images

JSSRC=					\
	Utils.js			\
	Toolkit.js			\
	Logo.js				\
	mixin/CBind.js			\
	data/reader/JsonObject.js	\
	data/ProxmoxProxy.js		\
	data/UpdateStore.js		\
	data/DiffStore.js		\
	data/ObjectStore.js		\
	data/RRDStore.js		\
	data/TimezoneStore.js		\
	data/model/Realm.js		\
	form/DisplayEdit.js		\
	form/ExpireDate.js		\
	form/IntegerField.js		\
	form/TextField.js		\
	form/DateTimeField.js		\
	form/Checkbox.js		\
	form/KVComboBox.js		\
	form/LanguageSelector.js	\
	form/ComboGrid.js		\
	form/RRDTypeSelector.js		\
	form/BondModeSelector.js	\
	form/NetworkSelector.js		\
	form/RealmComboBox.js		\
	form/PruneKeepField.js		\
	form/RoleSelector.js		\
	form/DiskSelector.js		\
	form/MultiDiskSelector.js	\
	form/TaskTypeSelector.js	\
	button/Button.js		\
	button/HelpButton.js		\
	grid/ObjectGrid.js		\
	grid/PendingObjectGrid.js	\
	panel/DiskList.js		\
	panel/InputPanel.js		\
	panel/InfoWidget.js		\
	panel/LogView.js		\
	panel/JournalView.js		\
	panel/PermissionView.js		\
	panel/PruneKeepPanel.js		\
	panel/RRDChart.js		\
	panel/GaugeWidget.js		\
	window/Edit.js			\
	window/PasswordEdit.js		\
	window/SafeDestroy.js		\
	window/TaskViewer.js		\
	window/LanguageEdit.js		\
	window/DiskSmart.js		\
	window/ZFSDetail.js		\
	node/APT.js			\
	node/NetworkEdit.js		\
	node/NetworkView.js		\
	node/DNSEdit.js			\
	node/HostsView.js		\
	node/DNSView.js			\
	node/Tasks.js			\
	node/ServiceView.js		\
	node/TimeEdit.js		\
	node/TimeView.js

all: ${SUBDIRS}
	set -e && for i in ${SUBDIRS}; do ${MAKE} -C $$i; done

.lint-incremental: ${JSSRC}
	eslint $?
	touch "$@"

.PHONY: lint
check: lint
lint: ${JSSRC}
	eslint --strict ${JSSRC}

proxmoxlib.js: .lint-incremental ${JSSRC}
	# add the version as comment in the file
	echo "// ${DEB_VERSION_UPSTREAM_REVISION}" > $@.tmp
	cat ${JSSRC} >> $@.tmp
	mv $@.tmp $@

install: proxmoxlib.js
	install -d -m 755 ${WWWBASEDIR}
	install -m 0644 proxmoxlib.js ${WWWBASEDIR}
	set -e && for i in ${SUBDIRS}; do ${MAKE} -C $$i $@; done

.PHONY: clean
clean:
	rm -f proxmoxlib.js

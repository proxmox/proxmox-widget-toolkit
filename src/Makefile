include defines.mk

SUBDIRS= css images proxmox-dark

# bundle it for now from the libjs-marked debian package to avoid touching our proxies file mapper,
# we could also just ship a link to the packages file and load from same path as the widget-toolkit
MARKEDJS=/usr/share/javascript/marked/marked.min.js

JSSRC=					\
	Utils.js			\
	Schema.js			\
	Toolkit.js			\
	Logo.js				\
	Parser.js			\
	mixin/CBind.js			\
	data/reader/JsonObject.js	\
	data/ProxmoxProxy.js		\
	data/UpdateStore.js		\
	data/DiffStore.js		\
	data/ObjectStore.js		\
	data/RRDStore.js		\
	data/TimezoneStore.js		\
	data/model/Realm.js		\
	data/model/Certificates.js	\
	data/model/ACME.js		\
	form/BandwidthSelector.js	\
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
	form/ACME.js			\
	form/UserSelector.js		\
	button/Button.js		\
	button/AltText.js		\
	button/HelpButton.js		\
	grid/ObjectGrid.js		\
	grid/PendingObjectGrid.js	\
	panel/AuthView.js		\
	panel/DiskList.js		\
	panel/EOLNotice.js		\
	panel/InputPanel.js		\
	panel/InfoWidget.js		\
	panel/LogView.js		\
	panel/NodeInfoRepoStatus.js	\
	panel/JournalView.js		\
	panel/PermissionView.js		\
	panel/PruneKeepPanel.js		\
	panel/RRDChart.js		\
	panel/GaugeWidget.js		\
	panel/Certificates.js		\
	panel/ACMEAccount.js		\
	panel/ACMEPlugin.js		\
	panel/ACMEDomains.js		\
	panel/StatusView.js		\
	panel/TfaView.js		\
	panel/NotesView.js		\
	window/Edit.js			\
	window/PasswordEdit.js		\
	window/SafeDestroy.js		\
	window/PackageVersions.js	\
	window/TaskViewer.js		\
	window/LanguageEdit.js		\
	window/DiskSmart.js		\
	window/ZFSDetail.js		\
	window/Certificates.js		\
	window/ACMEAccount.js		\
	window/ACMEPluginEdit.js	\
	window/ACMEDomains.js		\
	window/FileBrowser.js		\
	window/AuthEditBase.js		\
	window/AuthEditOpenId.js	\
	window/TfaWindow.js		\
	window/AddTfaRecovery.js	\
	window/AddTotp.js		\
	window/AddWebauthn.js		\
	window/AddYubico.js		\
	window/TfaEdit.js		\
	window/NotesEdit.js		\
	node/APT.js			\
	node/APTRepositories.js		\
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
	eslint --strict api-viewer/APIViewer.js
lint: ${JSSRC}
	eslint --strict ${JSSRC}
	touch ".lint-incremental"

proxmoxlib.js: .lint-incremental ${JSSRC}
	# add the version as comment in the file
	echo "// ${DEB_VERSION_UPSTREAM_REVISION}" > $@.tmp
	cat ${JSSRC} ${MARKEDJS}  >> $@.tmp
	mv $@.tmp $@

install: proxmoxlib.js
	install -d -m 755 ${WWWBASEDIR}
	install -m 0644 proxmoxlib.js ${WWWBASEDIR}
	set -e && for i in ${SUBDIRS}; do ${MAKE} -C $$i $@; done

.PHONY: clean
clean:
	rm -f proxmoxlib.js

include defines.mk

ESLINT ?= $(if $(shell command -v pve-eslint), pve-eslint, eslint)

SUBDIRS= css images proxmox-dark

# bundle it for now from the libjs-marked debian package to avoid touching our proxies file mapper,
# we could also just ship a link to the packages file and load from same path as the widget-toolkit
MARKEDJS=/usr/share/javascript/marked/marked.js

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
	data/model/NotificationConfig.js	\
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
	form/ThemeSelector.js		\
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
	panel/NotificationConfigView.js	\
	panel/NotificationGroupEditPanel.js	\
	panel/JournalView.js		\
	panel/PermissionView.js		\
	panel/PruneKeepPanel.js		\
	panel/RRDChart.js		\
	panel/GaugeWidget.js		\
	panel/GotifyEditPanel.js	\
	panel/Certificates.js		\
	panel/ACMEAccount.js		\
	panel/ACMEPlugin.js		\
	panel/ACMEDomains.js		\
	panel/SendmailEditPanel.js	\
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
	window/EndpointEditBase.js	\
	window/NotificationFilterEdit.js \
	window/FileBrowser.js		\
	window/AuthEditBase.js		\
	window/AuthEditOpenId.js	\
	window/AuthEditLDAP.js		\
	window/TfaWindow.js		\
	window/AddTfaRecovery.js	\
	window/AddTotp.js		\
	window/AddWebauthn.js		\
	window/AddYubico.js		\
	window/TfaEdit.js		\
	window/NotesEdit.js		\
	window/ThemeEdit.js		\
	window/SyncWindow.js	\
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

all: $(SUBDIRS)
	set -e && for i in $(SUBDIRS); do $(MAKE) -C $$i; done

.lint-incremental: $(JSSRC)
	$(ESLINT) $?
	touch "$@"

.PHONY: lint
check: lint
	$(ESLINT) --strict api-viewer/APIViewer.js
lint: $(JSSRC)
	$(ESLINT) --strict $(JSSRC)
	touch ".lint-incremental"

BUILD_TIME=$(or $(SOURCE_DATE_EPOCH),$(shell date '+%s.%N'))
BUILD_VERSION=$(or $(DEB_VERSION),$(shell git rev-parse HEAD),unknown version)
proxmoxlib.js: .lint-incremental $(JSSRC)
	# add the version as comment in the file
	echo "// v$(BUILD_VERSION)-t$(BUILD_TIME)" > $@.tmp
	cat $(JSSRC) $(MARKEDJS)  >> $@.tmp
	mv $@.tmp $@

proxmoxlib.min.js: proxmoxlib.js
	uglifyjs $< -c -m -o $@.tmp
	mv $@.tmp $@

install: proxmoxlib.js proxmoxlib.min.js
	install -d -m 755 $(WWWBASEDIR)
	install -m 0644 proxmoxlib.js proxmoxlib.min.js $(WWWBASEDIR)
	set -e && for i in $(SUBDIRS); do $(MAKE) -C $$i $@; done

.PHONY: clean
clean:
	rm -f proxmoxlib.js* proxmoxlib.min.js* .lint-incremental

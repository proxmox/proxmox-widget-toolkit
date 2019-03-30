PACKAGE=proxmox-widget-toolkit
PKGVER=1.0
PKGREL=24

BUILDDIR ?= ${PACKAGE}-${PKGVER}
GITVERSION:=$(shell git rev-parse HEAD)

DEB=${PACKAGE}_${PKGVER}-${PKGREL}_all.deb
DSC=${PACKAGE}_${PKGVER}-${PKGREL}.dsc

DESTDIR=

DOCDIR=${DESTDIR}/usr/share/doc/${PACKAGE}

WWWBASEDIR=${DESTDIR}/usr/share/javascript/${PACKAGE}

JSSRC=					\
	Utils.js			\
	Toolkit.js			\
	mixin/CBind.js			\
	data/reader/JsonObject.js	\
	data/ProxmoxProxy.js		\
	data/UpdateStore.js		\
	data/DiffStore.js		\
	data/ObjectStore.js		\
	data/RRDStore.js		\
	data/TimezoneStore.js		\
	form/IntegerField.js		\
	form/TextField.js		\
	form/DateTimeField.js		\
	form/Checkbox.js		\
	form/KVComboBox.js		\
	form/LanguageSelector.js	\
	form/ComboGrid.js		\
	form/RRDTypeSelector.js		\
	form/BondModeSelector.js	\
	button/Button.js		\
	button/HelpButton.js		\
	grid/ObjectGrid.js		\
	grid/PendingObjectGrid.js	\
	panel/InputPanel.js		\
	panel/LogView.js		\
	panel/RRDChart.js		\
	panel/GaugeWidget.js		\
	window/Edit.js			\
	window/PasswordEdit.js		\
	window/TaskViewer.js		\
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

all:

${BUILDDIR}:
	rm -rf ${BUILDDIR}
	rsync -a * ${BUILDDIR}
	echo "git clone git://git.proxmox.com/git/proxmox-widget-toolkit.git\\ngit checkout ${GITVERSION}" >  ${BUILDDIR}/debian/SOURCE

.PHONY: deb
deb: ${DEB}
${DEB}: ${BUILDDIR}
	cd ${BUILDDIR}; dpkg-buildpackage -b -us -uc
	lintian ${DEB}

.PHONY: dsc
dsc: ${DSC}
${DSC}: ${BUILDDIR}
	cd ${BUILDDIR}; dpkg-buildpackage -S -us -uc -d -nc
	lintian ${DSC}

.PHONY: lint
lint: ${JSSRC}
	jslint ${JSSRC}

proxmoxlib.js: ${JSSRC}
	# add the version as comment in the file
	echo "// ${PKGVER}-${PKGREL}" > $@.tmp
	cat ${JSSRC} >> $@.tmp
	mv $@.tmp $@

install: proxmoxlib.js
	install -d -m 755 ${WWWBASEDIR}
	install -m 0644 proxmoxlib.js ${WWWBASEDIR}

.PHONY: upload
upload: ${DEB}
	tar cf - ${DEB} | ssh -X repoman@repo.proxmox.com -- upload --product pve,pmg --dist stretch

distclean: clean

clean:
	rm -rf ${BUILDDIR} *.tar.gz *.dsc *.deb *.changes *.buildinfo proxmoxlib.js
	find . -name '*~' -exec rm {} ';'

.PHONY: dinstall
dinstall: ${DEB}
	dpkg -i ${DEB}

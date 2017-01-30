PACKAGE=proxmox-widget-toolkit
PKGVER=1.0
PKGREL=1

DEB=${PACKAGE}_${PKGVER}-${PKGREL}_all.deb

DESTDIR=

DOCDIR=${DESTDIR}/usr/share/doc/${PACKAGE}

WWWBASEDIR=${DESTDIR}/usr/share/javascript/${PACKAGE}

JSSRC=					\
	Utils.js			\
	data/reader/JsonObject.js	\
	data/ProxmoxProxy.js		\
	data/UpdateQueue.js		\
	data/UpdateStore.js		\
	data/DiffStore.js		\
	data/ObjectStore.js		\
	data/TimezoneStore.js		\
	grid/ObjectGrid.js		\
	window/Edit.js			\
	window/TaskViewer.js		\
	node/TimeEdit.js		\
	node/TimeView.js

all:

.PHONY: deb
deb ${DEB}:
	rm -rf build
	rsync -a * build
	cd build; dpkg-buildpackage -b -us -uc
	lintian ${DEB}

.PHONY: lint
lint: ${JSSRC}
	jslint ${JSSRC}

proxmoxlib.js: ${JSSRC}
	cat ${JSSRC} >$@.tmp
	mv $@.tmp $@

install: proxmoxlib.js
	install -d -m 755 ${WWWBASEDIR}
	install -m 0644 proxmoxlib.js ${WWWBASEDIR}

.PHONY: upload
upload: ${DEB}
	# fixme	tar cf - ${DEB} | ssh repoman@repo.proxmox.com upload

distclean: clean

clean:
	rm -rf ./build *.deb *.changes *.buildinfo
	find . -name '*~' -exec rm {} ';'

.PHONY: dinstall
dinstall: ${DEB}
	dpkg -i ${DEB}

include /usr/share/dpkg/pkg-info.mk

export PACKAGE=proxmox-widget-toolkit
BUILDDIR ?= ${PACKAGE}-${DEB_VERSION_UPSTREAM}
DEB=${PACKAGE}_${DEB_VERSION_UPSTREAM_REVISION}_all.deb
DSC=${PACKAGE}_${DEB_VERSION_UPSTREAM_REVISION}.dsc

GITVERSION:=$(shell git rev-parse HEAD)

${BUILDDIR}:
	rm -rf ${BUILDDIR} ${BUILDDIR}.tmp
	cp -a src/ ${BUILDDIR}.tmp
	cp -a debian ${BUILDDIR}.tmp/
	echo "git clone git://git.proxmox.com/git/proxmox-widget-toolkit.git\\ngit checkout ${GITVERSION}" >  ${BUILDDIR}.tmp/debian/SOURCE
	mv ${BUILDDIR}.tmp/ ${BUILDDIR}

.PHONY: deb
deb: ${DEB}
${DEB}: ${BUILDDIR}
	cd ${BUILDDIR}; dpkg-buildpackage -b -us -uc
	lintian ${DEB}

.PHONY: dsc
dsc: ${DSC}
${DSC}: ${BUILDDIR}
	cd ${BUILDDIR}; dpkg-buildpackage -S -us -uc -d
	lintian ${DSC}

.PHONY: lint
lint: ${JSSRC}
	${MAKE} -C src lint

.PHONY: upload
upload: ${DEB}
	tar cf - ${DEB} | ssh -X repoman@repo.proxmox.com -- upload --product pve,pmg,pbs --dist buster

distclean: clean
clean:
	rm -rf ${BUILDDIR} ${BUILDDIR}.tmp *.tar.gz *.dsc *.deb *.changes *.buildinfo
	find . -name '*~' -exec rm {} ';'

.PHONY: dinstall
dinstall: ${DEB}
	dpkg -i ${DEB}

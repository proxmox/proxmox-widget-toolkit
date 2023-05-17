include /usr/share/dpkg/pkg-info.mk
export DEB_VERSION_UPSTREAM_REVISION

export PACKAGE=proxmox-widget-toolkit

DEB=$(PACKAGE)_$(DEB_VERSION_UPSTREAM_REVISION)_all.deb
DEV_DEB=$(PACKAGE)-dev_$(DEB_VERSION_UPSTREAM_REVISION)_all.deb

DEBS=$(DEB) $(DEV_DEB)
DSC=$(PACKAGE)_$(DEB_VERSION_UPSTREAM_REVISION).dsc

BUILDDIR ?= $(PACKAGE)-$(DEB_VERSION_UPSTREAM)

$(BUILDDIR): GITVERSION:=$(shell git rev-parse HEAD)
$(BUILDDIR):
	rm -rf $(BUILDDIR) $(BUILDDIR).tmp
	cp -a src/ $(BUILDDIR).tmp
	cp -a debian $(BUILDDIR).tmp/
	echo "git clone git://git.proxmox.com/git/proxmox-widget-toolkit.git\\ngit checkout $(GITVERSION)" >  $(BUILDDIR).tmp/debian/SOURCE
	mv $(BUILDDIR).tmp/ $(BUILDDIR)

.PHONY: deb
deb: $(DEBS)
$(DEBS): $(BUILDDIR)
	cd $(BUILDDIR); dpkg-buildpackage -b -us -uc
	lintian $(DEBS)

.PHONY: dsc
dsc: $(DSC)
$(DSC): $(BUILDDIR)
	cd $(BUILDDIR); dpkg-buildpackage -S -us -uc -d
	lintian $(DSC)

.PHONY: lint
lint: $(JSSRC)
	$(MAKE) -C src lint

.PHONY: upload
upload: UPLOAD_DIST ?= $(DEB_DISTRIBUTION)
upload: $(DEBS)
	tar cf - $(DEB) | ssh -X repoman@repo.proxmox.com -- upload --product pve,pmg,pbs --dist $(UPLOAD_DIST)
	tar cf - $(DEV_DEB) | ssh -X repoman@repo.proxmox.com -- upload --product devel --dist $(UPLOAD_DIST)

distclean: clean
clean:
	$(MAKE) -C src clean
	rm -rf $(PACKAGE)-[0-9]*/ *.tar.* *.dsc *.deb *.changes *.buildinfo *.build

.PHONY: dinstall
dinstall: $(DEBS)
	dpkg -i $(DEBS)

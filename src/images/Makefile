include ../defines.mk

IMAGES=pmx-clear-trigger.svg		\
       openid-icon.svg			\
       icon-cpu.svg			\
       icon-ram.svg			\
       debian-swirl-openlogo.svg	\
       proxmox_logo.svg			\
       proxmox-symbol-x.svg		\
       spinner.svg			\

all:

.PHONY: install
install: $(IMAGES)
	install -d $(WWWIMAGESDIR)
	for i in $(IMAGES); do install -m 0644 $$i $(WWWIMAGESDIR)/$$i; done

.PHONY: clean
clean:

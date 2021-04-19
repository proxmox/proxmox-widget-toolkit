# icon-cpu, icon-ram
# are self made (sources as .xcf)

include ../defines.mk

IMAGES=pmx-clear-trigger.png	\
       icon-cpu.png		\
       icon-ram.png		\


all:

.PHONY: install
install: ${IMAGES}
	install -d ${WWWIMAGESDIR}
	for i in ${IMAGES}; do install -m 0755 $$i ${WWWIMAGESDIR}/$$i; done

.PHONY: clean
clean:

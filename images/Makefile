include ../defines.mk

IMAGES=

all:

.PHONY: install
install: ${IMAGES}
	install -d ${WWWIMAGESDIR}
	for i in ${IMAGES}; do install -m 0755 $$i ${WWWIMAGESDIR}/$$i; done

.PHONY: clean
clean:

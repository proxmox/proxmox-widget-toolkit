include ../defines.mk

CSS=

all:

.PHONY: install
install: ${CSS}
	install -d ${WWWCSSDIR}
	for i in ${CSS}; do install -m 0755 $$i ${WWWCSSDIR}/$$i; done

.PHONY: clean
clean:

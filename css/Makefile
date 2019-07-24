include ../defines.mk

CSS=ext6-pmx.css

all:

.PHONY: install
install: ${CSS}
	install -d ${WWWCSSDIR}
	for i in ${CSS}; do install -m 0755 $$i ${WWWCSSDIR}/$$i; done

.PHONY: clean
clean:

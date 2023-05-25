include ../defines.mk

SCSSSRC=scss/ProxmoxDark.scss 			\
	scss/abstracts/_mixins.scss 		\
	scss/abstracts/_variables.scss 		\
	scss/extjs/_body.scss 			\
	scss/extjs/form/_button.scss 		\
	scss/extjs/form/_combobox.scss 		\
	scss/extjs/form/_formfield.scss 	\
	scss/extjs/_grid.scss 			\
	scss/extjs/_menu.scss 			\
	scss/extjs/_panel.scss 			\
	scss/extjs/_presentation.scss 		\
	scss/extjs/_progress.scss 		\
	scss/extjs/_splitter.scss 		\
	scss/extjs/_tabbar.scss 		\
	scss/extjs/_tip.scss 			\
	scss/extjs/_toolbar.scss 		\
	scss/extjs/_treepanel.scss 		\
	scss/extjs/_window.scss 		\
	scss/other/_charts.scss 		\
	scss/other/_icons.scss 			\
	scss/proxmox/_general.scss 		\
	scss/proxmox/_helpbutton.scss 		\
	scss/proxmox/_loadingindicator.scss	\
	scss/proxmox/_markdown.scss 		\
	scss/proxmox/_nodes.scss 		\
	scss/proxmox/_quarantine.scss 		\
	scss/proxmox/_storages.scss 		\
	scss/proxmox/_tags.scss 		\
	scss/proxmox/_datepicker.scss

.PHONY: all
all: theme-proxmox-dark.css

.PHONY: install
install: theme-proxmox-dark.css
	install -d $(WWWTHEMEDIR)/
	install -m 0664 theme-proxmox-dark.css $(WWWTHEMEDIR)/

theme-proxmox-dark.css: $(SCSSSRC)
	sassc -t compressed $< $@.tmp
	mv $@.tmp $@

.PHONY: clean
clean:
	rm -rf theme-proxmox-dark.css

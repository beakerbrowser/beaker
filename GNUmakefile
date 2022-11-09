# PATH=/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/usr/X11/bin
SHELL									:= /bin/bash

PWD										?= pwd_unknown
#space:=
#space+=

# CURRENT_PATH := $(subst $(lastword $(notdir $(MAKEFILE_LIST))),,$(subst $(space),\$(space),$(shell realpath '$(strip $(MAKEFILE_LIST))')))
# export CURRENT_PATH

THIS_DIR=$(dir $(abspath $(firstword $(MAKEFILE_LIST))))
export THIS_DIR

TIME									:= $(shell date +%s)
export TIME

# PROJECT_NAME defaults to name of the current directory.
ifeq ($(project),)
PROJECT_NAME							:= $(notdir $(PWD))
else
PROJECT_NAME							:= $(project)
endif
export PROJECT_NAME

ifeq ($(NODE_VERSION),)
#NODE_VERSION									:= $(shell node --version)
NODE_VERSION									:= 12
else
NODE_VERSION									:= $(NODE_VERSION)
endif
export NODE_VERSION

ifeq ($(force),true)
FORCE									:= --force
endif
export FORCE

#GIT CONFIG
GIT_USER_NAME							:= $(shell git config user.name)
export GIT_USER_NAME
GIT_USER_EMAIL							:= $(shell git config user.email)
export GIT_USER_EMAIL
GIT_SERVER								:= https://github.com
export GIT_SERVER
GIT_PROFILE								:= $(shell git config user.name)
export GIT_PROFILE
GIT_BRANCH								:= $(shell git rev-parse --abbrev-ref HEAD)
export GIT_BRANCH
GIT_HASH								:= $(shell git rev-parse --short HEAD)
export GIT_HASH
GIT_PREVIOUS_HASH						:= $(shell git rev-parse --short HEAD^1)
export GIT_PREVIOUS_HASH
GIT_REPO_ORIGIN							:= $(shell git remote get-url origin)
export GIT_REPO_ORIGIN
GIT_REPO_NAME							:= $(PROJECT_NAME)
export GIT_REPO_NAME
GIT_REPO_PATH							:= $(HOME)/$(GIT_REPO_NAME)
export GIT_REPO_PATH

HOMEBREW_BREW_GIT_REMOTE=$(strip $(THIS_DIR))brew# put your Git mirror of Homebrew/brew here
export HOMEBREW_BREW_GIT_REMOTE

HOMEBREW_CORE_GIT_REMOTE=$(strip $(THIS_DIR))homebrew-core# put your Git mirror of Homebrew/homebrew-core here
export HOMEBREW_CORE_GIT_REMOTE

BREW                                    := $(shell which brew)
export BREW
# BREW_PREFIX                             := $(shell brew --prefix)
export BREW_PREFIX
# BREW_CELLAR                             := $(shell brew --cellar)
export BREW_CELLAR
HOMEBREW_NO_ENV_HINTS                   :=false
export HOMEBREW_NO_ENV_HINTS


##make	:	command			description
.ONESHELL:
.PHONY:-
.PHONY:	init
.PHONY:	help
.PHONY:	report
.PHONY:	brew
.SILENT:
##	:

-: help
	@echo "source ~/.bashrc"
	@echo "source ~/.bash_profile"
##	:	init
init:
#	@["$(shell $(SHELL))" == "/bin/zsh"] && zsh --emulate sh
	@cd ./scripts && ./initialize

.PHONY:build
##	:	build
build:
	@cd ./scripts && yarn run build

.PHONY:install
##	:	install - ./scripts yarn install
install:
	@cd ./scripts && yarn install

##	:	burnthemall - hard reset and build
burnthemall:
	@cd ./scripts && yarn run burnthemall
##	:	brew - install Homebrew locally
brew:-
	$(shell git clone https://github.com/Homebrew/brew.git)
	$(shell git clone https://github.com/Homebrew/homebrew-core.git)
	git config --global --add safe.directory $(HOMEBREW_BREW_GIT_REMOTE)
	git config --global --add safe.directory $(HOMEBREW_CORE_GIT_REMOTE)
	$(shell curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh > install-brew.sh && chmod +x install-brew.sh)
	bash -c "$(PWD)/install-brew.sh"
	git config --global --add safe.directory $(HOMEBREW_BREW_GIT_REMOTE)
	git config --global --add safe.directory $(HOMEBREW_CORE_GIT_REMOTE)
##	:	help
help:
	@echo ''
	@sed -n 's/^##ARGS//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'
	# @sed -n 's/^.PHONY//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'
	@echo ""
	@echo ""
	@echo ""
	@echo "Useful Commands:"
	@echo ""
	@echo "gpg --output public.pgp --armor --export FINGERPRINT"

##	:	report			environment args
report:
	@echo ''
	@echo ' TIME=${TIME}	'
	@echo ' CURRENT_PATH=${CURRENT_PATH}	'
	@echo ' THIS_DIR=${THIS_DIR}	'
	@echo ' PROJECT_NAME=${PROJECT_NAME}	'
	@echo ' NODE_VERSION=${NODE_VERSION}	'
	@echo ' GIT_USER_NAME=${GIT_USER_NAME}	'
	@echo ' GIT_USER_EMAIL=${GIT_USER_EMAIL}	'
	@echo ' GIT_SERVER=${GIT_SERVER}	'
	@echo ' GIT_PROFILE=${GIT_PROFILE}	'
	@echo ' GIT_BRANCH=${GIT_BRANCH}	'
	@echo ' GIT_HASH=${GIT_HASH}	'
	@echo ' GIT_PREVIOUS_HASH=${GIT_PREVIOUS_HASH}	'
	@echo ' GIT_REPO_ORIGIN=${GIT_REPO_ORIGIN}	'
	@echo ' GIT_REPO_NAME=${GIT_REPO_NAME}	'
	@echo ' GIT_REPO_PATH=${GIT_REPO_PATH}	'
	@echo ' BREW=${BREW}	'
	@echo ' HOMEBREW_BREW_GIT_REMOTE=${HOMEBREW_BREW_GIT_REMOTE}	'
	@echo ' HOMEBREW_CORE_REMOTE=${HOMEBREW_CORE_GIT_REMOTE}	'
	@echo ' BREW_PREFIX=${BREW_PREFIX}	'
	@echo ' BREW_CELLAR=${BREW_CELLAR}	'
	@echo ' HOMEBREW_NO_ENV_HINTS=${HOMEBREW_NO_ENV_HINTS}	'

#.PHONY:
#phony:
#	@sed -n 's/^.PHONY//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'

.PHONY: whatami
##	:	whatami			report system info
whatami:
	./whatami.sh
#.PHONY:readme
#readme:
#	make help > source/COMMANDS.md
#	git add -f README.md && git commit -m "make readme" && git push -f origin master
.PHONY: adduser-git
##	:	adduser-git		add a user named git
adduser-git:
	source $(PWD)/adduser-git.sh && adduser-git



.PHONY: command
##	:	command		 	command sequence
command: executable
	@echo "command sequence here..."




.PHONY: executable
executable:
	chmod +x ./scripts/initialize
.PHONY: exec
##	:	executable		make shell scripts executable
exec: executable

.PHONY: checkbrew template brew
.ONESHELL:
template: template-update
template-update: checkbrew-install
##	:	checkbrew		source and run checkbrew command
##	:	checkbrew-install	install template.sh
checkbrew: checkbrew-install
checkbrew-install:
	install -bC $(PWD)/template.sh /usr/local/bin/checkbrew

.PHONY: nvm
.ONESHELL:
##	:	nvm		 	install node version manager
nvm: executable
	@curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash || git pull -C $(HOME)/.nvm
#	@export NVM_DIR="$(HOME)/.nvm"
#	@bash -c "[ -s '$(NVM_DIR)/nvm.sh' ] && \. '$(NVM_DIR)/nvm.sh'"
#	@bash -c "[ -s '$(NVM_DIR)/bash_completion' ] && \. '$(NVM_DIR)/bash_completion'"
#	@echo "source ~/.bashrc"
	@echo "-------- Restart your terminal!!!! ---------"
#	@bash -c  "source ~/.bashrc && nvm install -s 12"
#	@bash -c  "source ~/.bashrc && nvm use 12"
#	@bash -c  "source ~/.bashrc && echo 'nvm  --version ' && nvm --version"
#	@bash -c  "source ~/.bashrc && echo 'node --version ' && node --version"
#install $(NODE_VERSION) && nvm use $(NODE_VERSION)"
#	@bash -c "nvm install $(NODE_VERSION) && nvm use $(NODE_VERSION) || echo 'nvm'"

##	:	cirrus			source and run install-cirrus command
cirrus: executable
	bash -c "source $(PWD)/install-cirrus.sh && install-cirrus $(FORCE)"
##	:	config-dock		source and run config-dock-prefs
config-dock: executable
	bash -c "source $(PWD)/config-dock-prefs.sh && brew-install-dockutils && config-dock-prefs $(FORCE)"

.PHONY: all
##	:	all			execute installer scripts
all:- executable init 

gnupg:- executable
	bash -c "source template.sh && checkbrew install gettext gnutls libassuan libgcrypt libgpg-error libksba libusb npth pinentry gnupg"

# bash -c "test docker-compose && brew unlink docker-completion || echo"
# bash -c "source template.sh && checkbrew install --cask docker"

# 	./install-Docker.sh && \
# 	./install-FastLane.sh && \
# 	./install-Onyx.sh && \
# 	./install-SassC.sh && \
# 	./install-discord.sh && \
# 	./install-gnupg+suite.sh && \
# 	./install-iterm2.sh && \
# 	./install-keeping-you-awake.sh && \
# 	./install-little-snitch.sh && \
# 	./install-openssl.sh && \
# 	./install-python3.X.sh && \
# 	./install-protonvpn.sh && \
# 	./install-ql-plugins.sh && \
# 	./install-qt5.sh && \
# 	./install-qt5-creator.sh && \
# 	./install-sha256sum.sh && \
# 	./install-vmware-fusion11.sh #Mojave && \
# 	./install-vypr-vpn.sh && \
# 	./install-youtube-dl.sh && \
# 	./install-ytop.sh && \
# 	./install-umbrel-dev.sh && \
# 	./install-vim.sh && \
# 	./install-inkscape.sh && \
# 	./install-dotfiles-on-remote.sh && \
	echo; exit;"

.PHONY: shell alpine alpine-shell debian debian-shell d-shell
shell: alpine-shell
##	:	alpine-shell		run install-shell.sh alpine user=root
alpine-shell: alpine
alpine:
	./install-shell.sh alpine
d-shell: debian-shell
##	:	debian-shell		run install-shell.sh debian user=root
debian-shell: debian
debian:
	./install-shell.sh debian
.PHONY: vim
##	:	vim			install vim and macvim on macos
vim: executable
	./install-vim.sh $(FORCE)

.PHONY: protonvpn
protonvpn: executable
	./install-protonvpn.sh $(FORCE)

.PHONY: config-git
config-git: executable
	cat config-git.sh
	./config-git.sh

.PHONY: qt5
##	:	qt5			install qt@5
qt5: executable
	./install-qt5.sh
	./install-qt5-creator.sh

.PHONY: hub
hub: executable
	./install-github-utility.sh

.PHONY: config-github
config-github: executable
	cat config-git.sh
	./config-github.sh

.PHONY: install-bitcoin-libs
.ONESHELL:
##	:	bitcoin-libs		install bitcoin-libs
bitcoin-libs: exec
	bash -c "source $(PWD)/bitcoin-libs.sh && install-bitcoin-libs"


.PHONY: push
.ONESHELL:
push: touch-time
	bash -c "git add -f *.sh *.md sources .gitignore .bash* .vimrc .github index.html TIME *makefile && \
		git commit -m 'update from $(GIT_USER_NAME) on $(TIME)'"
	git push -f origin	+master:master

.PHONY: docs readme index
index: docs
readme: docs
docs:
	@echo 'docs'
	bash -c "if pgrep MacDown; then pkill MacDown; fi"
	bash -c "make help > $(PWD)/sources/COMMANDS.md"
	bash -c 'cat $(PWD)/sources/HEADER.md                >  $(PWD)/README.md'
	bash -c 'cat $(PWD)/sources/COMMANDS.md              >> $(PWD)/README.md'
	bash -c 'cat $(PWD)/sources/FOOTER.md                >> $(PWD)/README.md'
	#bash -c "if hash open 2>/dev/null; then open README.md; fi || echo failed to open README.md"
	#brew install pandoc
	bash -c "if hash pandoc 2>/dev/null; then echo; fi || brew install pandoc"
	#bash -c 'pandoc -s README.md -o index.html  --metadata title="$(GH_USER_SPECIAL_REPO)" '
	bash -c 'pandoc -s README.md -o index.html'
	#bash -c "if hash open 2>/dev/null; then open README.md; fi || echo failed to open README.md"
	git add --ignore-errors sources/*.md
	git add --ignore-errors *.md
	#git ls-files -co --exclude-standard | grep '\.md/$\' | xargs git

.PHONY: submodule submodules
submodule: submodules
submodules:
	git submodule update --init --recursive
	git submodule foreach 'git fetch origin; git checkout $$(git rev-parse --abbrev-ref HEAD); git reset --hard origin/$$(git rev-parse --abbrev-ref HEAD); git submodule update --recursive; git clean -dfx'


.PHONY: touch-time
.ONESHELL:
touch-time:
	#rm -f 1618*
	#$(shell git rm -f 1618*)
	touch TIME
	echo $(TIME) $(shell git rev-parse HEAD) >> TIME

ifeq ($(bitcoin-version),)
	@echo Example:
	@echo add tag v22.0rc3
BITCOIN_VERSION:=v22.0rc3
else
BITCOIN_VERSION:=$(bitcoin-version)
endif
export BITCOIN_VERSION
.PHONY: bitcoin-test-battery
bitcoin-test-battery:
	bash -c "./bitcoin-test-battery.sh $(BITCOIN_VERSION) "
.PHONY: install-dotfiles-on-remote
install-dotfiles-on-remote:
	./install-dotfiles-on-remote.sh

.PHONY: node
node:
	$(MAKE) -f node.mk

clean:
	rm -rf ./node_modules/
	rm -rf ./scripts/node_modules/
clean-usr-local-libs:
	rm -rf /usr/local/libs/node_modules/
clean-nvm:
	rm -rf $(HOME)/.nvm
	$(MAKE) nvm
clean-npm:
	rm -rf $(HOME)/.npm
clean-all: clean clean-nvm clean-npm clean-usr-local-libs


-include node.mk
# vim: set noexpandtab:
# vim: set setfiletype make

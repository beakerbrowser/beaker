# more extensive check intended for scenerios such as pulling an existing repo you're unfamiliar with, pulling down changes
# and wanting to ensure your current node_modules/ is up-to-date with any package.json changes, etc.

# you will automatically be prompted to install the two required global npm modules

nodecheck() {
  printf "\n\n"
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' .
  printf "ENVIRONMENT:\n"
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' .
  printf "node version:\n"
  source ~/.nvm/nvm.sh [ -x "$(command -v nvm)" ] && nvm ls
  [ ! -x "$(command -v nvm)" ] && node -v
  printf "\n"
  printf "npm version:\n"
  npm -v
  printf "\n"
  printf '"''package.json''"'' exist?:  '
  [ -f "package.json" ] && echo "✓"
  [ ! -f "package.json" ] && echo "✘"
  printf '"''node_modules/''"'' exist?:  '
  [ -d node_modules/ ] && echo "✓"
  [ ! -d node_modules/ ] && echo "✘"
  printf '\n'
  printf "checking your environment (node & npm) against package.json requirements...\n\n"
  [ -x "$(command -v check-engine)" ] && check-engine
  if [ ! -x "$(command -v check-engine)" ]
  then
    read -p "You do not have check-engine npm package globally installed which lets you check your current node/npm version against the current directory package.json, install now? (y/n)" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        npm i -g check-engine && echo "\n global dep installed, running it now... \n" && check-engine
    fi
  fi
  printf "\n\n"
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' .
  printf "DEPENDENCIES:\n"
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' .
  printf '\n'
  printf "checking node_modules against package.json requirements...\n"
  printf "(note: green is ok, red/orange *might* be bad)\n\n"
  [ -x "$(command -v check-dependencies)" ] && check-dependencies --verbose
  if [ ! -x "$(command -v check-dependencies)" ]
  then
    read -p "You do not have check-dependencies npm package globally installed which lets you check your current installed local dependencies against the current directory package.json, install now? (y/n)" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        npm i -g check-dependencies && echo "\n global dep installed, running it now... \n" && check-dependencies --verbose
    fi
  fi
  printf "\n"
  printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
  printf "\n\n"
}
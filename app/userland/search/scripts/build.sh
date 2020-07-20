#! /bin/sh

rm -Rf ./build
mkdir ./build
cp index.* ./build/
cp serve.json ./build/
cp -R ./js ./build/js
cp -R ./css ./build/css
cp -R ./webfonts ./build/webfonts
cp ./favicon.png ./build/favicon.png
rollup ./js/main.js --format iife --name main --file ./build/js/main.build.js
cat ./index.html | sed 's/main.js/main.build.js/' > ./build/index.html
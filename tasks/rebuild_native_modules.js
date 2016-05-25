// Rebuilds native node modules for Electron.
// More: https://github.com/atom/electron/blob/master/docs/tutorial/using-native-node-modules.md

'use strict';

var path = require('path');
var Q = require('q');
var electron = require('electron-prebuilt');
var electronPackage = require('electron-prebuilt/package.json');
var rebuild = require('electron-rebuild');

var pathToElectronNativeModules = path.join(__dirname, '../app/node_modules');

rebuild.shouldRebuildNativeModules(electron)
.then(function (shouldBuild) {
    if (!shouldBuild) {
        return true;
    }

    console.log('Rebuilding native modules for Electron...');

    return rebuild.installNodeHeaders(electronPackage.version)
    .then(function () {
        return rebuild.rebuildNativeModules(electronPackage.version, pathToElectronNativeModules);
    });
})
.then(function () {
    console.log('Rebuilding complete.');
})
.catch(function (err) {
    console.error("Rebuilding error!");
    console.error(err);
});

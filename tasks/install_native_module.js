// Install native module from npm and compile it for Electron.
// Usage: npm run install-native -- name_of_native_module

'use strict';

var childProcess = require('child_process');
var Q = require('q');
var appDir = require('fs-jetpack').cwd(__dirname, '../app');
var argv = require('yargs').argv;
var utils = require('./utils');

var ensureElectronRebuildInstalled = function () {
    var deferred = Q.defer();

    try {
        // If require is successful it means module is already installed.
        require('electron-rebuild');
        deferred.resolve();
    } catch (err) {
        childProcess.spawn(utils.spawnablePath('npm'), [
            'install', '--save-dev', 'electron-rebuild'
        ], {
            stdio: 'inherit'
        })
        .on('error', deferred.reject)
        .on('close', deferred.resolve);
    }

    return deferred.promise;
};

var ensurePostinstallRunsElectronRebuild = function () {
    var postinstallScript = 'node ../tasks/rebuild_native_modules';

    var appManifest = appDir.read('package.json', 'json');

    if (typeof appManifest.scripts === 'undefined') {
        appManifest.scripts = {};
    }

    // Let's do it 100% bulletproof and check if programmer didn't
    // pust some custom stuff into postinstall script already.
    if (typeof appManifest.scripts.postinstall === 'undefined') {
        appManifest.scripts.postinstall = postinstallScript;
        appDir.write('package.json', appManifest);
    } else if (appManifest.scripts.postinstall.indexOf(postinstallScript) === -1) {
        appManifest.scripts.postinstall += ' && ' + postinstallScript;
        appDir.write('package.json', appManifest);
    }

    return Q();
};

var installNativeModule = function () {
    var deferred = Q.defer();
    var moduleName = argv._[0];

    if (!moduleName) {
        deferred.reject('Module name not specified! Correct usage is "npm run install-native -- name_of_native_module" (remember about space after "--").');
    } else {
        childProcess.spawn(utils.spawnablePath('npm'), [
            'install', '--save', moduleName
        ], {
            cwd: appDir.cwd(),
            stdio: 'inherit'
        })
        .on('error', deferred.reject)
        .on('close', deferred.resolve);
    }

    return deferred.promise;
};

var runRebuild = function () {
    var deferred = Q.defer();

    childProcess.spawn(utils.spawnablePath('npm'), [
        'run', 'postinstall'
    ], {
        cwd: appDir.cwd(),
        stdio: 'inherit'
    })
    .on('error', deferred.reject)
    .on('close', deferred.resolve);

    return deferred.promise;
};

ensureElectronRebuildInstalled()
.then(ensurePostinstallRunsElectronRebuild)
.then(installNativeModule)
.then(runRebuild)
.catch(function (err) {
    console.error(err);
});

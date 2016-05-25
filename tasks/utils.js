'use strict';

var argv = require('yargs').argv;
var os = require('os');

module.exports.os = function () {
    switch (os.platform()) {
        case 'darwin':
            return 'osx';
        case 'linux':
            return 'linux';
        case 'win32':
            return 'windows';
    }
    return 'unsupported';
};

module.exports.replace = function (str, patterns) {
    Object.keys(patterns).forEach(function (pattern) {
        var matcher = new RegExp('{{' + pattern + '}}', 'g');
        str = str.replace(matcher, patterns[pattern]);
    });
    return str;
};

module.exports.getReleasePackageName = function(manifest) {
    return module.exports.replace(manifest.packageNameTemplate, {
        name: manifest.name,
        version: manifest.version,
        build: manifest.build,
        productName: manifest.productName,
        platform: process.platform,
        arch: process.arch
    });
}

module.exports.getEnvName = function () {
    return argv.env || 'development';
};

module.exports.getSigningId = function (manifest) {
    return argv.sign || (manifest.osx.codeSignIdentitiy ? manifest.osx.codeSignIdentitiy.dmg : undefined);
};

module.exports.getMASSigningId = function (manifest) {
    return argv['mas-sign'] || (manifest.osx.codeSignIdentitiy ? manifest.osx.codeSignIdentitiy.MAS : undefined);
};

module.exports.getMASInstallerSigningId = function (manifest) {
    return argv['mas-installer-sign'] || (manifest.osx.codeSignIdentitiy ? manifest.osx.codeSignIdentitiy.MASInstaller : undefined);
};

module.exports.releaseForMAS = function () {
    return !!argv.mas;
};

// Fixes https://github.com/nodejs/node-v0.x-archive/issues/2318
module.exports.spawnablePath = function (path) {
    if (process.platform === 'win32') {
        return path + '.cmd';
    }
    return path;
};

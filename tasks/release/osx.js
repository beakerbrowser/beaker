'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');
var child_process = require('child_process');

var projectDir;
var releasesDir;
var tmpDir;
var finalAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    tmpDir = projectDir.dir('./tmp', { empty: true });
    releasesDir = projectDir.dir('./releases');
    manifest = projectDir.read('app/package.json', 'json');
    finalAppDir = tmpDir.cwd(manifest.productName + '.app');

    return new Q();
};

var copyRuntime = function () {
    return projectDir.copyAsync('node_modules/electron-prebuilt/dist/Electron.app', finalAppDir.path());
};

var cleanupRuntime = function () {
    finalAppDir.remove('Contents/Resources/default_app');
    finalAppDir.remove('Contents/Resources/atom.icns');
    return new Q();
};

var packageBuiltApp = function () {
    var deferred = Q.defer();

    asar.createPackageWithOptions(projectDir.path('build'), finalAppDir.path('Contents/Resources/app.asar'), {
        dot: true
    }, function () {
        deferred.resolve();
    });

    return deferred.promise;
};

var finalize = function () {
    // Prepare main Info.plist
    var info = projectDir.read('resources/osx/Info.plist');
    info = utils.replace(info, {
        productName: manifest.productName,
        identifier: manifest.osx.identifier,
        version: manifest.version,
        build: manifest.osx.build,
        copyright: manifest.copyright,
        LSApplicationCategoryType: manifest.osx.LSApplicationCategoryType
    });
    finalAppDir.write('Contents/Info.plist', info);

    // Prepare Info.plist of Helper apps
    [' EH', ' NP', ''].forEach(function (helper_suffix) {
        info = projectDir.read('resources/osx/helper_apps/Info' + helper_suffix + '.plist');
        info = utils.replace(info, {
            productName: manifest.productName,
            identifier: manifest.identifier
        });
        finalAppDir.write('Contents/Frameworks/Electron Helper' + helper_suffix + '.app/Contents/Info.plist', info);
    });

    // Copy icon
    projectDir.copy('resources/osx/icon.icns', finalAppDir.path('Contents/Resources/icon.icns'));

    return new Q();
};

var renameApp = function () {
    // Rename helpers
    [' Helper EH', ' Helper NP', ' Helper'].forEach(function (helper_suffix) {
        finalAppDir.rename('Contents/Frameworks/Electron' + helper_suffix + '.app/Contents/MacOS/Electron' + helper_suffix, manifest.productName + helper_suffix );
        finalAppDir.rename('Contents/Frameworks/Electron' + helper_suffix + '.app', manifest.productName + helper_suffix + '.app');
    });
    // Rename application
    finalAppDir.rename('Contents/MacOS/Electron', manifest.productName);
    return new Q();
};

var signApp = function () {
    var identity = utils.getSigningId(manifest);
    var MASIdentity = utils.getMASSigningId(manifest);
    var MASInstallerIdentity = utils.getMASInstallerSigningId(manifest);

    if (utils.releaseForMAS()) {
        if (!MASIdentity || !MASInstallerIdentity) {
            gulpUtil.log('--mas-sign and --mas-installer-sign are required to release for Mac App Store!');
            process.exit(0);
        }
        var cmds = [
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libnode.dylib"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/Electron Framework.framework/Versions/A"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/' + manifest.productName + ' Helper.app/"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/' + manifest.productName + ' Helper EH.app/"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/' + manifest.productName + ' Helper NP.app/"'
        ];

        if (finalAppDir.exists('Contents/Frameworks/Squirrel.framework/Versions/A')) {
            // # Signing a non-MAS build.
            cmds.push('codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist "' + finalAppDir.path() + '/Contents/Frameworks/Mantle.framework/Versions/A"');
            cmds.push('codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist "' + finalAppDir.path() + '/Contents/Frameworks/ReactiveCocoa.framework/Versions/A"');
            cmds.push('codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist "' + finalAppDir.path() + '/Contents/Frameworks/Squirrel.framework/Versions/A"');
        }

        cmds.push('codesign -f -s "' + MASIdentity + '" --entitlements resources/osx/parent.plist -v "' + finalAppDir.path() + '"');

        cmds.push('productbuild --component "' + finalAppDir.path() + '" /Applications --sign "' + MASInstallerIdentity + '" "' + releasesDir.path(manifest.productName + '.pkg') + '"');

        var result = new Q();
        cmds.forEach(function (cmd) {
            result = result.then(function(result) {
                gulpUtil.log('Signing with:', cmd);
                return Q.nfcall(child_process.exec, cmd);
            });
        });
        result = result.then(function(result) {
            return new Q();
        });
        return result;

    } else if (identity) {
        var cmd = 'codesign --deep --force --sign "' + identity + '" "' + finalAppDir.path() + '"';
        gulpUtil.log('Signing with:', cmd);
        return Q.nfcall(child_process.exec, cmd);
    } else {
        return new Q();
    }
};

var packToDmgFile = function () {
    if (utils.releaseForMAS()) {
        return new Q();
    }

    var deferred = Q.defer();

    var appdmg = require('appdmg');
    var dmgName = utils.getReleasePackageName(manifest) + '.dmg';

    // Prepare appdmg config
    var dmgManifest = projectDir.read('resources/osx/appdmg.json');
    dmgManifest = utils.replace(dmgManifest, {
        productName: manifest.productName,
        appPath: finalAppDir.path(),
        dmgIcon: projectDir.path("resources/osx/dmg-icon.icns"),
        dmgBackground: projectDir.path("resources/osx/dmg-background.png")
    });
    tmpDir.write('appdmg.json', dmgManifest);

    // Delete DMG file with this name if already exists
    releasesDir.remove(dmgName);

    gulpUtil.log('Packaging to DMG file... (' + dmgName + ')');

    var readyDmgPath = releasesDir.path(dmgName);
    appdmg({
        source: tmpDir.path('appdmg.json'),
        target: readyDmgPath
    })
    .on('error', function (err) {
        console.error(err);
    })
    .on('finish', function () {
        gulpUtil.log('DMG file ready!', readyDmgPath);
        deferred.resolve();
    });

    return deferred.promise;
};

var cleanClutter = function () {
    return tmpDir.removeAsync('.');
};

module.exports = function () {
    return init()
        .then(copyRuntime)
        .then(cleanupRuntime)
        .then(packageBuiltApp)
        .then(finalize)
        .then(renameApp)
        .then(signApp)
        .then(packToDmgFile)
        .then(cleanClutter)
        .catch(console.error);
};

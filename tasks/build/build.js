'use strict';

var pathUtil = require('path');
var Q = require('q');
var gulp = require('gulp');
var less = require('gulp-less');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var childProcess = require('child_process')
var plumber = require('gulp-plumber');
var jetpack = require('fs-jetpack');

var bundle = require('./bundle');
var generateSpecImportsFile = require('./generate_spec_imports');
var utils = require('../utils');

var projectDir = jetpack;
var srcDir = projectDir.cwd('./app');

// -------------------------------------
// Tasks
// -------------------------------------

function burnthemallMaybeTask () {
  const beakerPackageJson = projectDir.read('package.json', 'json')
  const electronPackageJson = projectDir.read('node_modules/electron/package.json', 'json')
  if (!beakerPackageJson || !electronPackageJson) return Promise.resolve(true)

  // is the installed version of electron different than the required one?
  if (beakerPackageJson.devDependencies.electron != electronPackageJson.version) {
    console.log('~~Electron version change detected.~~')
    console.log('We need to rebuild to fit the new version.')
    console.log('###### BURN THEM ALL! ######')

    childProcess.spawn('npm', ['run', 'burnthemall'], {
      stdio: 'inherit',
      env: process.env // inherit
    })
    return Promise.reject(new Error('Aborting build to do a full reinstall and rebuild'))
  }
  return Promise.resolve(true)
}

gulp.task('burnthemall-maybe', gulp.series(burnthemallMaybeTask))

var bundleApplication = function () {
  var bpViewsDir = srcDir.cwd('builtin-pages/views')
  var bpBuildDir = srcDir.cwd('builtin-pages/build')
  return Q.all([
    bundle(srcDir.path('background-process.js'),       srcDir.path('background-process.build.js')),
    bundle(srcDir.path('webview-preload.js'),          srcDir.path('webview-preload.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(srcDir.path('shell-window.js'),             srcDir.path('shell-window.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true, browserifyExclude: ['fs'] }),
    bundle(srcDir.path('shell-menus.js'),              srcDir.path('shell-menus.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(srcDir.path('location-bar.js'),             srcDir.path('location-bar.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(srcDir.path('perm-prompt.js'),              srcDir.path('perm-prompt.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(srcDir.path('modals.js'),                   srcDir.path('modals.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(srcDir.path('json-renderer.js'),            srcDir.path('json-renderer.build.js'), { browserify: true, basedir: srcDir.cwd(), excludeNodeModules: true }),
    bundle(bpViewsDir.path('downloads.js'),            bpBuildDir.path('downloads.build.js'), { browserify: true, basedir: bpViewsDir.cwd() }),
    bundle(bpViewsDir.path('history.js'),              bpBuildDir.path('history.build.js'), { browserify: true, basedir: bpViewsDir.cwd() }),
    bundle(bpViewsDir.path('settings.js'),             bpBuildDir.path('settings.build.js'), { browserify: true, basedir: bpViewsDir.cwd() }),
    bundle(bpViewsDir.path('swarm-debugger.js'),       bpBuildDir.path('swarm-debugger.build.js'), { browserify: true, basedir: bpViewsDir.cwd() }),
    bundle(bpViewsDir.path('watchlist.js'),            bpBuildDir.path('watchlist.build.js'), { browserify: true, basedir: bpViewsDir.cwd() }),
    bundle(bpViewsDir.path('editor.js'),               bpBuildDir.path('editor.build.js'), { browserify: true, basedir: bpViewsDir.cwd() })
  ]);
};

var bundleSpecs = function () {
  return generateSpecImportsFile().then(function (specEntryPointPath) {
    return bundle(specEntryPointPath, srcPath.path('spec.build.js'));
  });
};

var bundleTask = function () {
  if (utils.getEnvName() === 'test') {
    return bundleSpecs();
  }
  return bundleApplication();
};
gulp.task('bundle', gulp.series(['burnthemall-maybe'], bundleTask));
gulp.task('bundle-watch', gulp.series(bundleTask));


var buildLess = function (src, dest) {
  return gulp.src(src)
    .pipe(plumber())
    .pipe(less())
    .pipe(gulp.dest(dest));
}
var lessTask = function () {
  return  Q.all([
    buildLess('app/stylesheets/*.less', srcDir.path('stylesheets')),
    buildLess('app/stylesheets/builtin-pages/*.less', srcDir.path('stylesheets/builtin-pages')),
    buildLess('app/stylesheets/builtin-pages.less', srcDir.path('stylesheets')),
    buildLess('app/stylesheets/icons.less', srcDir.path('stylesheets'))
  ])
};
gulp.task('less', gulp.series(['burnthemall-maybe'], lessTask));
gulp.task('less-watch', gulp.series(lessTask));

gulp.task('build', gulp.series(['bundle', 'less']));

gulp.task('watch', gulp.series(['build', function () {
  gulp.watch(['app/**/*.js', '!app/**/*.build.js'], gulp.series('bundle-watch'))
  gulp.watch('app/**/*.less', gulp.series('less-watch'))
  return Promise.resolve(true)
}]));

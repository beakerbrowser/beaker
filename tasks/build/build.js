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
  if (!beakerPackageJson || !electronPackageJson) return

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
}

gulp.task('burnthemall-maybe', burnthemallMaybeTask)

var bundleApplication = function () {
  var bpDir = srcDir.cwd('builtin-pages')
  return Q.all([
    bundle(srcDir.path('background-process.js'),  srcDir.path('background-process.build.js')),
    bundle(srcDir.path('webview-preload.js'),     srcDir.path('webview-preload.build.js'), { browserify: true, basedir: srcDir.cwd() }),
    bundle(srcDir.path('shell-window.js'),        srcDir.path('shell-window.build.js'), { browserify: true, basedir: srcDir.cwd(), excludeNodeModules: true }),
    bundle(bpDir.path('downloads.js'),            bpDir.path('downloads.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('library.js'),              bpDir.path('library.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('bookmarks.js'),            bpDir.path('bookmarks.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('history.js'),              bpDir.path('history.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('settings.js'),             bpDir.path('settings.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('start.js'),                bpDir.path('start.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('create-archive-modal.js'), bpDir.path('create-archive-modal.build.js'), { browserify: true, basedir: bpDir.cwd() }),
    bundle(bpDir.path('fork-archive-modal.js'),   bpDir.path('fork-archive-modal.build.js'), { browserify: true, basedir: bpDir.cwd() })
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
gulp.task('bundle', ['burnthemall-maybe'], bundleTask);
gulp.task('bundle-watch', bundleTask);


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
    buildLess('app/stylesheets/shell-window.less', srcDir.path('stylesheets')),
    buildLess('app/stylesheets/builtin-pages.less', srcDir.path('stylesheets')),
    buildLess('app/stylesheets/icons.less', srcDir.path('stylesheets'))
  ])
};
gulp.task('less', ['burnthemall-maybe'], lessTask);
gulp.task('less-watch', lessTask);

gulp.task('build', ['bundle', 'less']);

gulp.task('watch', ['build'], function () {
  watch('app/**/*.js', batch(function (events, done) {
    var n = events._list.filter(function (f) { return f.path.indexOf('.build.js') === -1 }).length;
    if (n > 0)
      gulp.start('bundle-watch', done);
    else
      done();
  }));
  watch('app/**/*.less', batch(function (events, done) {
    gulp.start('less-watch', done);
  }));
});

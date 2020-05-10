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
var srcDir = projectDir.cwd('../app');

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
  var fgDir = srcDir.cwd('fg')
  var userlandDir = srcDir.cwd('userland')
  var bpViewsDir = srcDir.cwd('fg/builtin-pages/views')
  var bpBuildDir = srcDir.cwd('fg/builtin-pages/build')
  return Q.all([
    bundle(srcDir.path('main.js'),                     srcDir.path('main.build.js')),
    bundle(fgDir.path('webview-preload/index.js'),     fgDir.path('webview-preload/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(fgDir.path('shell-window/index.js'),        fgDir.path('shell-window/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true, browserifyExclude: ['fs'] }),
    bundle(fgDir.path('shell-menus/index.js'),         fgDir.path('shell-menus/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(fgDir.path('location-bar/index.js'),        fgDir.path('location-bar/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(fgDir.path('prompts/index.js'),             fgDir.path('prompts/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(fgDir.path('perm-prompt/index.js'),         fgDir.path('perm-prompt/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(fgDir.path('modals/index.js'),              fgDir.path('modals/index.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(fgDir.path('json-renderer/index.js'),       fgDir.path('json-renderer/index.build.js'), { browserify: true, basedir: srcDir.cwd(), excludeNodeModules: true }),
    bundle(userlandDir.path('site-info/js/main.js'),   userlandDir.path('site-info/js/main.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(userlandDir.path('editor/js/main.js'),      userlandDir.path('editor/js/main.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(userlandDir.path('settings/js/main.js'),    userlandDir.path('settings/js/main.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
    bundle(userlandDir.path('history/js/main.js'),     userlandDir.path('history/js/main.build.js'), { browserify: true, basedir: srcDir.cwd(), browserifyBuiltins: true }),
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
    buildLess('../app/fg/builtin-pages/stylesheets/*.less', srcDir.path('fg/builtin-pages/stylesheets')),
    buildLess('../app/fg/builtin-pages/stylesheets/builtin-pages/*.less', srcDir.path('fg/builtin-pages/stylesheets/builtin-pages')),
    buildLess('../app/fg/builtin-pages/stylesheets/builtin-pages.less', srcDir.path('fg/builtin-pages/stylesheets')),
    buildLess('../app/fg/builtin-pages/stylesheets/icons.less', srcDir.path('fg/builtin-pages/stylesheets'))
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

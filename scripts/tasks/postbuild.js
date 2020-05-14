var gulp = require('gulp')
var jetpack = require('fs-jetpack')
var run = require('./util-run')

gulp.task('postbuild', gulp.series(function () {
  // for some reason, electron-builder is spitting out 'Beaker Browser-{version}{ext}'
  // but the auto updater expects 'beaker-browser-{version}{ext}'
  // couldnt figure out how to reconfig the builder, so just rename the output assets

  var cwd = jetpack.cwd('../dist')
  var names = cwd.list()
  names.forEach(function (name) {
    // windows assets:
    if (name.indexOf('Beaker Browser Setup') === 0 && name.indexOf('.exe') !== -1) {
      var newName = 'beaker-browser-setup-' + name.slice('Beaker Browser Setup '.length)
      return cwd.move(name, newName)
    }

    // osx assets:
    if (name.indexOf('Beaker Browser') === 0 && (name.indexOf('.dmg') !== -1 || name.indexOf('-mac.zip') !== -1)) {
      var newName = 'beaker-browser' + name.slice('Beaker Browser'.length)
      return cwd.move(name, newName)
    }
  })

  return Promise.resolve(true)
}))
const gulp = require('gulp')
const jetpack = require('fs-jetpack')
const run = require('./util-run')

gulp.task('postbuild', async () => {
  // for some reason, electron-builder is spitting out 'Beaker Browser-{version}{ext}'
  // but the auto updater expects 'beaker-browser-{version}{ext}'
  // couldnt figure out how to reconfig the builder, so just rename the output assets

  const cwd = jetpack.cwd('dist')
  const names = await cwd.listAsync()
  await Promise.all(names.map(name => {
    // windows assets:
    if (name.startsWith('Beaker Browser Setup') && name.endsWith('.exe')) {
      const newName = 'beaker-browser-setup-' + name.slice('Beaker Browser Setup '.length)
      return cwd.move(name, newName)
    }

    // osx assets:
    if (name.startsWith('Beaker Browser') && (name.endsWith('.dmg') || name.endsWith('-mac.zip'))) {
      const newName = 'beaker-browser' + name.slice('Beaker Browser'.length)
      return cwd.move(name, newName)
    }
  }))
})
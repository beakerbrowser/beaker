const gulp = require('gulp')
const jetpack = require('fs-jetpack')
const run = require('./util-run')

gulp.task('postbuild', async () => {
  // OSX - for some reason, electron-builder is spitting out 'Beaker Browser-{version}{ext}'
  // but the auto updater expects 'beaker-browser-{version}{ext}'
  // so auto-rename any files like that

  const cwd = jetpack.cwd('dist')
  const names = await cwd.listAsync()
  await Promise.all(names.map(name => {
    if (name.startsWith('Beaker Browser') && (name.endsWith('.dmg') || name.endsWith('-mac.zip'))) {
      const newName = 'beaker-browser' + name.slice('Beaker Browser'.length)
      return cwd.move(name, newName)
    }
  }))
})
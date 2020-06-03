var gulp = require('gulp')
var path = require('path')
var run = require('./util-run')
var homedir = require('os').homedir()

function runAsync (...args) {
  return new Promise(resolve => {
    run(...args, resolve)
  })
}

const MODULES_NEEDING_REBUILD = ['sqlite3']

//(cd app && HOME=~/.electron-gyp npm rebuild --runtime=electron --target=10.0.0-beta.2 --disturl=https://atom.io/download/atom-shell --build-from-source); gulp build

gulp.task('rebuild', gulp.series(async () => {
  // TODO read electron version
  var cwd = path.join(process.cwd(), '../app')
  console.log(cwd)
  var env = {}
  if (process.platform === 'darwin') {
    env = {
      // required to make spellchecker compile
      CXXFLAGS: '-mmacosx-version-min=10.10',
      LDFLAGS: '-mmacosx-version-min=10.10'
    }
  }
  env.HOME = path.join(homedir, '.electron-gyp')
  for (let mod of MODULES_NEEDING_REBUILD) {
    await runAsync(`npm rebuild ${mod} --runtime=electron --target=10.0.0-beta.2 --disturl=https://atom.io/download/atom-shell --build-from-source`, {cwd, env, shell: true})
  }
  await runAsync(`npm run build`, {shell: true})
}))
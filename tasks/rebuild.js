var gulp = require('gulp')
var path = require('path')
var run = require('./util-run')

function runAsync (...args) {
  return new Promise(resolve => {
    run(...args, resolve)
  })
}

const MODULES_NEEDING_REBUILD = ['sqlite3', 'sodium-native']

//(cd app && HOME=~/.electron-gyp npm rebuild --runtime=electron --target=8.1.1 --disturl=https://electronjs.org/headers --build-from-source); gulp build

gulp.task('rebuild', gulp.series(async () => {
  // TODO read electron version
  var cwd = path.join(process.cwd(), 'app')
  console.log(cwd)
  var env = {}
  // if (process.platform === 'darwin') {
  //   env = {
  //     // required to make spellchecker compile
  //     CXXFLAGS: '-mmacosx-version-min=10.10',
  //     LDFLAGS: '-mmacosx-version-min=10.10'
  //   }
  // }
  for (let mod of MODULES_NEEDING_REBUILD) {
    await runAsync(`npm rebuild ${mod} --runtime=electron --target=8.1.1 --disturl=https://electronjs.org/headers --build-from-source`, {cwd, env, shell: true})
  }
}))
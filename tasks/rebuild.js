var gulp = require('gulp')
var path = require('path')
var run = require('./util-run')

//(cd app && npm rebuild --runtime=electron --target=4.0.3 --disturl=https://atom.io/download/atom-shell --build-from-source); gulp build

gulp.task('rebuild', gulp.series(function () {
  // TODO read electron version
  var cwd = path.join(process.cwd(), 'app')
  console.log(cwd)
  return new Promise(resolve => {
    var env = {
      // required to make spellchecker compile
      CXXFLAGS: '-mmacosx-version-min=10.10',
      LDFLAGS: '-mmacosx-version-min=10.10'
    }
    run(`npm rebuild --runtime=electron --target=4.0.3 --disturl=https://atom.io/download/atom-shell --build-from-source`, {cwd, env, shell: true}, function () {
      run(`npm run build`, {shell: true}, function () {
        resolve()
      })
    })
  })
}))
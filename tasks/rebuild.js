var gulp = require('gulp')
var path = require('path')
var run = require('./util-run')

//(cd app && npm rebuild --runtime=electron --target=2.0.5 --disturl=https://atom.io/download/atom-shell --build-from-source); gulp build

gulp.task('rebuild', function () {
  // TODO read electron version
  var cwd = path.join(process.cwd(), 'app')
  console.log(cwd)
  run(`npm rebuild --runtime=electron --target=2.0.5 --disturl=https://atom.io/download/atom-shell --build-from-source`, {cwd, shell: true}, function () {
    run(`npm run build`, {shell: true}, function () {
      process.exit(0)
    })
  })
})

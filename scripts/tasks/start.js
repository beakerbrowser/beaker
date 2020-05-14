'use strict'

const gulp = require('gulp')
const start = require('./start-cli')

gulp.task('start', gulp.series(start))
gulp.task('start-watch', gulp.series('watch', start))

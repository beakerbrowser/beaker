'use strict'

const gulp = require('gulp')
const start = require('./start-cli')

gulp.task('start', start)
gulp.task('start-watch', ['watch'], start)

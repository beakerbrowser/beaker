'use strict';

var childProcess = require('child_process');
var electron = require('electron');
var gulp = require('gulp');

gulp.task('start', start);
gulp.task('start-watch', ['watch'], start);

function start () {
  childProcess.spawn(electron, ['./app', '--disable-gpu'], {
    stdio: 'inherit'
  })
  .on('close', function () {
    // User closed the app. Kill the host process.
    process.exit();
  });
}
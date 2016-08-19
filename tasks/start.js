'use strict';

var childProcess = require('child_process');
var electron = require('electron-prebuilt');
var gulp = require('gulp');

gulp.task('start', function () {
  childProcess.spawn(electron, ['./app', '--disable-gpu'], {
    stdio: 'inherit'
  })
  .on('close', function () {
    // User closed the app. Kill the host process.
    process.exit();
  });
});

gulp.task('start-watch', ['watch', 'start'])
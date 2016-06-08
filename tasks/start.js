'use strict';

var childProcess = require('child_process');
var electron = require('electron-prebuilt');
var gulp = require('gulp');

gulp.task('start', ['watch'], function () {
  childProcess.spawn(electron, ['./app'], {
    stdio: 'inherit'
  })
  .on('close', function () {
    // User closed the app. Kill the host process.
    process.exit();
  });
});

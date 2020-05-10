#!/usr/bin/env node

const NODE_FLAGS = `--js-flags="--throw-deprecation"`

var childProcess = require('child_process')
var electron = require('electron')
var jetpack = require('fs-jetpack');

var app = jetpack.cwd('../app').cwd()

module.exports = function () {
  if (process.env.ELECTRON_PATH) {
    electron = process.env.ELECTRON_PATH
  }
  console.log('Spawning electron', electron)
  childProcess.spawn(electron, [/*'--inspect',*/ NODE_FLAGS, app], {
    stdio: 'inherit',
    env: process.env // inherit
  })
  .on('close', function () {
    // User closed the app. Kill the host process.
    process.exit()
  })
}

if (require.main === module) {
  module.exports()
}

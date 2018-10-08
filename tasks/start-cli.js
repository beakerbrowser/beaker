#!/usr/bin/env node

const NODE_FLAGS = `--js-flags="--throw-deprecation"`

var childProcess = require('child_process')
var electron = require('electron')
var path = require('path')

var app = path.join(__dirname, '../app')

module.exports = function () {
  if (process.env.ELECTRON_PATH) {
    electron = process.env.ELECTRON_PATH
  }
  console.log('Spawning electron', electron)
  childProcess.spawn(electron, [/*'--inspect',*/ NODE_FLAGS, '--enable-sandbox', app], {
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

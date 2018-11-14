const {join} = require('path')
const rpcAPI = require('pauls-electron-rpc')
const beakerCoreDatDaemon = require('@beaker/core/dat/daemon')

beakerCoreDatDaemon.setup({
  rpcAPI,
  logfilePath: join(window.userDataPath, 'dat.log')
})
const {join} = require('path')
const rpcAPI = require('pauls-electron-rpc')
const beakerCoreDatDaemon = require('@beaker/core/dat/daemon')

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

process.on('disconnect', () => {
  process.exit()
})

process.once('message', firstMsg => {
  beakerCoreDatDaemon.setup({
    rpcAPI,
    logfilePath: join(firstMsg.userDataPath, 'dat.log')
  })
  process.send({ready: true})
  console.log('dat-daemon ready')
})
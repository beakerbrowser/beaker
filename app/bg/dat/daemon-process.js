const HyperdriveDaemon = require('hyperdrive-daemon')
var daemon

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

process.on('disconnect', () => {
  console.log('stopping hyperdrive daemon...')
  daemon.stop()
  console.log('hyperdrive daemon stopped')
  process.exit()
})

process.once('message', async (firstMsg) => {
  daemon = new HyperdriveDaemon()
  await daemon.start()
  process.send({ready: true})
  console.log('hyperdrive daemon ready')
})
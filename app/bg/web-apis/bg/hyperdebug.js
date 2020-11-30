import { EventEmitter } from 'events'
import emitStream from 'emit-stream'
import hyper from '../../hyper/index'

// exported api
// =

export default {  
  async listCores (url) {
    var drive = await hyper.drives.getOrLoadDrive(url)
    return (await drive.session.drive.stats()).stats
  },

  async hasCoreBlocks (key, from, to) {
    var client = hyper.daemon.getHyperspaceClient()
    var core = client.corestore().get({key: typeof key === 'string' ? Buffer.from(key, 'hex') : key})
    var bits = []
    for (let i = from; i < to; i++) {
      bits.push(await core.has(i))
    }
    return bits
  },

  async createCoreEventStream (url, corename) {
    corename = ['metadata', 'content'].includes('corename') || 'metadata'
    var drive = await hyper.drives.getOrLoadDrive(url)
    var core = drive.session.drive[corename]
    return emitStream(core)
  }
}
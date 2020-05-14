import { Duplex, Readable } from 'streamx'
import { getClient } from '../../hyper/daemon'
import * as drives from '../../hyper/drives'
import { PermissionsError } from 'beaker-error-constants'

// exported api
// =

export default {
  async join (topic) {
    var drive = await getSenderDrive(this.sender)
    topic = massageTopic(topic, drive.discoveryKey)

    var stream = new Duplex({
      write (data, cb) {
        if (!Array.isArray(data) || typeof data[0] === 'undefined' || typeof data[1] === 'undefined') {
          console.debug('Incorrectly formed message from peersockets send API', data)
          return cb(null)
        }
        topicHandle.send(data[0], data[1])
        cb(null)
      }
    })
    stream.objectMode = true
    var topicHandle = getClient().peersockets.join(topic, {
      onmessage (peerId, message) {
        stream.push(['message', {peerId, message}])
      }
    })
    drive.pda.numActiveStreams++
    stream.on('close', () => {
      drive.pda.numActiveStreams--
      topicHandle.close()
    })
    
    return stream
  },

  async watch () {
    var drive = await getSenderDrive(this.sender)
    var stream = new Readable()
    var stopwatch = getClient().peers.watchPeers(drive.discoveryKey, {
      onjoin: async (peerId) => stream.push(['join', {peerId}]),
      onleave: (peerId) => stream.push(['leave', {peerId}])
    })
    stream.on('close', () => stopwatch())
    return stream
  }
}

// internal methods
// =

async function getSenderDrive (sender) {
  var url = sender.getURL()
  if (!url.startsWith('hyper://')) {
    throw new PermissionsError('PeerSockets are only available on hyper:// origins')
  }
  return drives.getOrLoadDrive(url)
}

function massageTopic (topic, discoveryKey) {
  return `webapp/${discoveryKey.toString('hex')}/${topic}`
}
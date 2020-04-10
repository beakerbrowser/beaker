import { Duplex, Readable } from 'streamx'
import { getClient } from '../../hyper/daemon'
import * as drives from '../../hyper/drives'
import { PermissionsError } from 'beaker-error-constants'

// globals
// =

var activeNamespaces = {} // map of {[origin]: Object}

// exported api
// =

export default {
  async info () {
    // TODO
  },

  async join (topic) {
    var drive = await getSenderDrive(this.sender)
    topic = massageTopic(topic, drive.discoveryKey)

    console.debug('Joining topic', topic)
    var stream = new Duplex({
      write (data, cb) {
        if (!Array.isArray(data) || typeof data[0] === 'undefined' || typeof data[1] === 'undefined') {
          console.debug('Incorrectly formed message from peersockets send API', data)
          return cb(null)
        }
        console.log('sending message', ...data)
        topicHandle.send(data[0], data[1])
        cb(null)
      }
    })
    stream.objectMode = true
    var topicHandle = getClient().peersockets.join(topic, {
      onmessage (peerId, message) {
        console.log('got message', peerId, message)
        stream.push(['message', {peerId, message}])
      }
    })
    stream.on('close', () => {
      console.debug('Closing topic', topic)
      topicHandle.close()
    })
    
    return stream
  },

  async watch () {
    var drive = await getSenderDrive(this.sender)
    var stream = new Readable()
    console.debug('Watching peers', drive.discoveryKey)
    var stopwatch = getClient().peers.watchPeers(drive.discoveryKey, {
      onjoin: async (peerId) => {
        console.log('onjoin', peerId)
        stream.push(['join', {peerId}])
      },
      onleave: (peerId) => {
        console.log('onleave', peerId)
        stream.push(['leave', {peerId}])
      }
    })
    stream.on('close', () => {
      console.debug('Unwatching peers', drive.discoveryKey)
      stopwatch()
    })
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
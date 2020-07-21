import { Duplex, Readable } from 'streamx'
import { getClient } from '../../hyper/daemon'
import * as drives from '../../hyper/drives'
import { PermissionsError } from 'beaker-error-constants'

const sessionAliases = new Map()

// exported api
// =

export default {
  async join (topic) {
    var drive = await getSenderDrive(this.sender)
    topic = massageTopic(topic, drive.discoveryKey)
    const aliases = getAliases(this.sender)

    var stream = new Duplex({
      write (data, cb) {
        if (!Array.isArray(data) || typeof data[0] === 'undefined' || typeof data[1] === 'undefined') {
          console.debug('Incorrectly formed message from peersockets send API', data)
          return cb(null)
        }
        const peer = getPeerForAlias(aliases, data[0])
        if (!peer) return
        topicHandle.send(data[1], peer)
        cb(null)
      }
    })
    stream.objectMode = true
    var topicHandle = getClient().peersockets.join(topic, {
      onmessage (message, peer) {
        stream.push(['message', {peerId: createAliasForPeer(aliases, peer), message}])
      }
    })
    drive.pda.numActiveStreams++
    stream.on('close', () => {
      drive.pda.numActiveStreams--
      releaseAliases(this.sender, aliases)
      topicHandle.close()
    })

    return stream
  },

  async watch () {
    var drive = await getSenderDrive(this.sender)
    const aliases = getAliases(this.sender)
    var stream = new Readable()
    var stopwatch = getClient().peers.watchPeers(drive.key, {
      onjoin: async (peer) => stream.push(['join', {peerId: createAliasForPeer(aliases, peer)}]),
      onleave: (peer) => stream.push(['leave', {peerId: createAliasForPeer(aliases, peer) }])
    })
    stream.on('close', () => {
      releaseAliases(this.sender, aliases)
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

function getAliases (sender) {
  let aliases = sessionAliases.get(sender)
  if (!aliases) {
    aliases = {refs: 0, byPeer: new Map(), byAlias: []}
    sessionAliases.set(sender, aliases)
  }
  aliases.refs++
  return aliases
}

function releaseAliases (sender, aliases) {
  if (!--aliases.refs) sessionAliases.delete(sender)
}

function createAliasForPeer (aliases, peer) {
  let alias = aliases.byPeer.get(peer)
  if (alias) return alias
  alias = aliases.byPeer.size + 1
  aliases.byPeer.set(peer, alias)
  aliases.byAlias[alias] = peer
  return alias
}

function getPeerForAlias (aliases, alias) {
  return aliases.byAlias[alias]
}

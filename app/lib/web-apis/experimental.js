import rpc from 'pauls-electron-rpc'
import {EventTargetFromStream} from './event-target'
import errors from 'beaker-error-constants'

import experimentalLibraryManifest from '../api-manifests/external/experimental/library'
import experimentalGlobalFetchManifest from '../api-manifests/external/experimental/global-fetch'
import experimentalDatPeersManifest from '../api-manifests/external/experimental/dat-peers'

const experimental = {}
const opts = {timeout: false, errors}

// dat or internal only
if (window.location.protocol === 'beaker:' || window.location.protocol === 'dat:') {
  const libraryRPC = rpc.importAPI('experimental-library', experimentalLibraryManifest, opts)
  const globalFetchRPC = rpc.importAPI('experimental-global-fetch', experimentalGlobalFetchManifest, opts)
  const datPeersRPC = rpc.importAPI('experimental-dat-peers', experimentalDatPeersManifest, opts)

  // experimental.library
  let libraryEvents = ['added', 'removed', 'updated', 'folder-synced', 'network-changed']
  experimental.library = new EventTargetFromStream(libraryRPC.createEventStream.bind(libraryRPC), libraryEvents)
  experimental.library.add = libraryRPC.add
  experimental.library.remove = libraryRPC.remove
  experimental.library.get = libraryRPC.get
  experimental.library.list = libraryRPC.list
  experimental.library.requestAdd = libraryRPC.requestAdd
  experimental.library.requestRemove = libraryRPC.requestRemove

  // experimental.globalFetch
  experimental.globalFetch = async function globalFetch (input, init) {
    var request = new Request(input, init)
    if (request.method !== 'HEAD' && request.method !== 'GET') {
      throw new Error('Only HEAD and GET requests are currently supported by globalFetch()')
    }
    var responseData = await globalFetchRPC.fetch({
      method: request.method,
      url: request.url,
      headers: request.headers
    })
    return new Response(responseData.body, responseData)
  }

  // experimental.datPeers
  class DatPeer {
    constructor (id, sessionData) {
      this.id = id
      this.sessionData = sessionData
    }
    send (data) {
      datPeersRPC.send(this.id, data)
    }
  }
  function prepDatPeersEvents (event, details) {
    var peer = new DatPeer(details.peerId, details.sessionData)
    delete details.peerId
    delete details.sessionData
    details.peer = peer
    return details
  }
  const datPeersEvents = ['connect', 'message', 'session-data', 'disconnect']
  experimental.datPeers = new EventTargetFromStream(datPeersRPC.createEventStream.bind(datPeersRPC), datPeersEvents, prepDatPeersEvents)
  experimental.datPeers.list = async () => {
    var peers = await datPeersRPC.list()
    return peers.map(p => new DatPeer(p.id, p.sessionData))
  }
  experimental.datPeers.get = async (peerId) => {
    var {sessionData} = await datPeersRPC.get(peerId)
    return new DatPeer(peerId, sessionData)
  }
  experimental.datPeers.broadcast = datPeersRPC.broadcast
  experimental.datPeers.getSessionData = datPeersRPC.getSessionData
  experimental.datPeers.setSessionData = datPeersRPC.setSessionData
}

export default experimental

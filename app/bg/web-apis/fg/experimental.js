/* globals Request Response fetch */

import { EventTargetFromStream } from './event-target'

import errors from 'beaker-error-constants'
import experimentalGlobalFetchManifest from '../manifests/external/experimental/global-fetch'
import experimentalCapturePageManifest from '../manifests/external/experimental/capture-page'
import experimentalDatPeersManifest from '../manifests/external/experimental/dat-peers'

export const setup = function (rpc) {
  const experimental = {}
  const opts = {timeout: false, errors}

  // hyperdrive or internal only
  if (['beaker:', 'hyper:'].includes(window.location.protocol)) {
    const globalFetchRPC = rpc.importAPI('experimental-global-fetch', experimentalGlobalFetchManifest, opts)
    const capturePageRPC = rpc.importAPI('experimental-capture-page', experimentalCapturePageManifest, opts)
    const datPeersRPC = rpc.importAPI('experimental-dat-peers', experimentalDatPeersManifest, opts)

    // experimental.globalFetch
    experimental.globalFetch = async function globalFetch (input, init) {
      var request = new Request(input, init)
      if (request.method !== 'HEAD' && request.method !== 'GET') {
        throw new Error('Only HEAD and GET requests are currently supported by globalFetch()')
      }
      try {
        var responseData = await globalFetchRPC.fetch({
          method: request.method,
          url: request.url,
          headers: request.headers
        })
        return new Response(responseData.body, responseData)
      } catch (e) {
        if (e.message === 'Can only send requests to http or https URLs' && request.url.startsWith('hyper://')) {
          // we can just use `fetch` for hyper:// URLs, because hyper:// does not enforce CORS
          return fetch(input, init)
        }
        throw e
      }
    }

    // experimental.capturePage
    experimental.capturePage = capturePageRPC.capturePage

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
    experimental.datPeers.getOwnPeerId = datPeersRPC.getOwnPeerId
  }

  return experimental
}

import EventEmitter from 'events'
import emitStream from 'emit-stream'
import {DatSessionDataExtMsg} from '@beaker/dat-session-data-ext-msg'
import {DatEphemeralExtMsg} from '@beaker/dat-ephemeral-ext-msg'

// globals
// =

var datSessionDataExtMsg = new DatSessionDataExtMsg()
var datEphemeralExtMsg = new DatEphemeralExtMsg()

// exported api
// =

export function setup () {
  datEphemeralExtMsg.on('message', onEphemeralMsg)
  datSessionDataExtMsg.on('session-data', onSessionDataMsg)
}

// call this on every archive created in the library
export function attach (archive) {
  datEphemeralExtMsg.watchDat(archive)
  datSessionDataExtMsg.watchDat(archive)
  archive._datPeersEvents = new EventEmitter()
  archive._datPeersOnPeerAdd = (peer) => onPeerAdd(archive, peer)
  archive._datPeersOnPeerRemove = (peer) => onPeerRemove(archive, peer)
  archive.metadata.on('peer-add', archive._datPeersOnPeerAdd)
  archive.metadata.on('peer-remove', archive._datPeersOnPeerRemove)
}

// call this on every archive destroyed in the library
export function detach (archive) {
  datEphemeralExtMsg.unwatchDat(archive)
  datSessionDataExtMsg.unwatchDat(archive)
  delete archive._datPeersEvents
  archive.metadata.removeListener('peer-add', archive._datPeersOnPeerAdd)
  archive.metadata.removeListener('peer-remove', archive._datPeersOnPeerRemove)
}

// impl for datPeers.list()
export function listPeers (archive) {
  return archive.metadata.peers.map(internalPeerObj => createWebAPIPeerObj(archive, internalPeerObj))
}

// impl for datPeers.getPeer(peerId)
export function getPeer (archive, peerId) {
  var internalPeerObj = archive.metadata.peers.find(internalPeerObj => getPeerId(internalPeerObj) === peerId)
  return createWebAPIPeerObj(archive, internalPeerObj)
}

// impl for datPeers.broadcast(msg)
export function broadcastEphemeralMessage (archive, payload) {
  datEphemeralExtMsg.broadcast(archive, encodeEphemeralMsg(payload))
}

// impl for datPeers.send(peerId, msg)
export function sendEphemeralMessage (archive, peerId, payload) {
  datEphemeralExtMsg.send(archive, peerId, encodeEphemeralMsg(payload))
}

// impl for datPeers.getSessionData()
export function getSessionData (archive) {
  return decodeSessionData(datSessionDataExtMsg.getLocalSessionData(archive))
}

// impl for datPeers.getSessionData(data)
export function setSessionData (archive, sessionData) {
  datSessionDataExtMsg.setLocalSessionData(archive, encodeSessionData(sessionData))
}

export function createDatPeersStream (archive) {
  return emitStream(archive._datPeersEvents)
}

// events
// =

function onPeerAdd (archive, internalPeerObj) {
  if (getPeerId(internalPeerObj)) onHandshook()
  else internalPeerObj.stream.stream.on('handshake', onHandshook)

  function onHandshook () {
    var peerId = getPeerId(internalPeerObj)

    // send session data
    if (datSessionDataExtMsg.getLocalSessionData(archive)) {
      datSessionDataExtMsg.sendLocalSessionData(archive, peerId)
    }

    // emit event
    archive._datPeersEvents.emit('connect', {
      peerId,
      sessionData: getPeerSessionData(archive, peerId)
    })
  }
}

function onPeerRemove (archive, internalPeerObj) {
  var peerId = getPeerId(internalPeerObj)
  if (peerId) {
    archive._datPeersEvents.emit('disconnect', {
      peerId,
      sessionData: getPeerSessionData(archive, peerId)
    })
  }
}

function onEphemeralMsg (archive, internalPeerObj, msg) {
  var peerId = getPeerId(internalPeerObj)
  archive._datPeersEvents.emit('message', {
    peerId,
    sessionData: getPeerSessionData(archive, peerId),
    data: decodeEphemeralMsg(msg)
  })
}

function onSessionDataMsg (archive, internalPeerObj, sessionData) {
  archive._datPeersEvents.emit('session-data', {
    peerId: getPeerId(internalPeerObj),
    sessionData: decodeSessionData(sessionData)
  })
}

// internal methods
// =

function getPeerId (internalPeerObj) {
  var feedStream = internalPeerObj.stream
  var protocolStream = feedStream.stream
  return protocolStream.remoteId ? protocolStream.remoteId.toString('hex') : null
}

function getPeerSessionData (archive, peerId) {
  return decodeSessionData(datSessionDataExtMsg.getSessionData(archive, peerId))
}

function createWebAPIPeerObj (archive, internalPeerObj) {
  var id = getPeerId(internalPeerObj)
  var sessionData = getPeerSessionData(archive, id)
  return {id, sessionData}
}

function encodeEphemeralMsg (payload) {
  var contentType
  if (Buffer.isBuffer(payload)) {
    contentType = 'application/octet-stream'
  } else {
    contentType = 'application/json'
    payload = Buffer.from(JSON.stringify(payload), 'utf8')
  }
  return {contentType, payload}
}

function decodeEphemeralMsg (msg) {
  var payload
  if (msg.contentType === 'application/json') {
    try {
      payload = JSON.parse(msg.payload.toString('utf8'))
    } catch (e) {
      console.error('Failed to parse ephemeral message', e, msg)
      payload = null
    }
  }
  return payload
}

function encodeSessionData (obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8')
}

function decodeSessionData (sessionData) {
  if (!sessionData || sessionData.length === 0) return null
  try {
    return JSON.parse(sessionData.toString('utf8'))
  } catch (e) {
    console.error('Failed to parse local session data', e, sessionData)
    return null
  }
}

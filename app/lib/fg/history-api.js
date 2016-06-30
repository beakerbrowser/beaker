/**
 * This is the client API to history
 * The server is implemented in background-process
 *
 * This should only be exposed to trusted code.
 **/

import { ipcRenderer } from 'electron'

// globals
// =

// active requests' cbs, waiting for a response
var requestCbs = []

// exported api
// =

export function setup () {
  ipcRenderer.on('history', onIPCMessage)
}

export function addVisit (visit, cb) {
  sendIPCRequest('addVisit', visit, cb)
}

export function getVisitHistory (opts, cb) {
  sendIPCRequest('getVisitHistory', opts, cb)
}

export function getMostVisited (opts, cb) {
  sendIPCRequest('getMostVisited', opts, cb)
}

export function search (q, cb) {
  sendIPCRequest('search', q, cb)
}

export function removeVisit (url, cb) {
  sendIPCRequest('removeVisit', url, cb)
}

export function removeAllVisits (cb) {
  sendIPCRequest('removeAllVisits', cb)
}

// internal methods
// =

function sendIPCRequest (command, ...args) {
  // track the cb
  var cb, requestId = requestCbs.length
  if (typeof args[args.length - 1] == 'function')
    cb = args.pop()
  else
    cb = (()=>{})
  requestCbs.push(cb)

  // send message
  ipcRenderer.send('history', command, requestId, ...args)
}

function onIPCMessage (event, command, requestId, ...args) {
  switch (command) {
    case 'reply':
      var cb = requestCbs[requestId]
      if (!cb)
        return console.warn('History reply came from main process for a nonwaiting request', arguments)
      requestCbs[requestId] = null
      cb.apply(window, args)
      break

    default:
      console.warn('Unknown history message', arguments)
  }
}
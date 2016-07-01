import { ipcRenderer } from 'electron'

// globals
// =

// active requests' cbs, waiting for a response
var requestCbs = []


// exported api
// =

export function setup () {
  ipcRenderer.on('sitedata', onIPCMessage)
}

export function get (key, cb) {
  sendIPCRequest('get', [key], cb)
}

export function set (key, value, cb) {
  sendIPCRequest('set', [key, value], cb)
}

export function getOtherOrigin (origin, key, cb) {
  sendIPCRequest('getOtherOrigin', [origin, key], cb)
}

export function setOtherOrigin (origin, key, value, cb) {
  sendIPCRequest('setOtherOrigin', [origin, key, value], cb)
}


// internal methods
// =

function sendIPCRequest (command, args, cb) {
  // track the cb
  var requestId = requestCbs.length
  requestCbs.push(cb || (()=>{}))

  // send message
  ipcRenderer.send('sitedata', command, requestId, ...args)
}

function onIPCMessage (event, command, requestId, ...args)  {
  switch (command) {
    case 'reply':
      var cb = requestCbs[requestId]
      if (!cb)
        return console.warn('Sitedata reply came from main process for a nonwaiting request', arguments)
      requestCbs[requestId] = null
      cb.apply(window, args)
      break

    default:
      console.warn('Unknown sitedata message', arguments)
  }
}
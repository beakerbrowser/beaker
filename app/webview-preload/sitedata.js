import { ipcRenderer } from 'electron'

// globals
// =

// active requests' cbs, waiting for a response
var requestCbs = []

// DEBUG
window.sitedataSet = set
window.sitedataGet = get


// exported api
// =

export function get (key, cb) {
  sendIPCRequest('get', key, null, cb)
}

export function set (key, value, cb) {
  sendIPCRequest('set', key, value, cb)
}


// internal methods
// =

function sendIPCRequest (command, key, value, cb) {
  // track the cb
  var requestId = requestCbs.length
  requestCbs.push(cb || (()=>{}))

  // send message
  ipcRenderer.send('sitedata', command, requestId, key, value)
}

ipcRenderer.on('sitedata', (event, command, requestId, ...args) => {
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
})
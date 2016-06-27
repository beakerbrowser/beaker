/**
 * This is the client API to bookmarks
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


export function add (url, title, cb) {
  sendIPCRequest('add', url, title, cb)
}

export function changeTitle (url, title, cb) {
  sendIPCRequest('changeTitle', url, title, cb)
}

export function changeUrl (oldUrl, newUrl, cb) {
  sendIPCRequest('changeUrl', oldUrl, newUrl, cb)
}

export function remove (url, cb) {
  sendIPCRequest('remove', url, cb)
}

export function get (url, cb) {
  sendIPCRequest('get', url, cb)
}

export function list (cb) {
  sendIPCRequest('list', cb)
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
  ipcRenderer.send('bookmarks', command, requestId, ...args)
}

ipcRenderer.on('bookmarks', (event, command, requestId, ...args) => {
  switch (command) {
    case 'reply':
      var cb = requestCbs[requestId]
      if (!cb)
        return console.warn('Bookmarks reply came from main process for a nonwaiting request', arguments)
      requestCbs[requestId] = null
      cb.apply(window, args)
      break

    default:
      console.warn('Unknown bookmarks message', arguments)
  }
})
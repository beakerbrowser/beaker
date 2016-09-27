import { ipcMain, session, BrowserWindow } from 'electron'
import log from '../../log'

// globals
// =

var idCounter = 0
var activeRequests = []

// exported api
// =

export function setup () {
  // wire up handlers
  session.defaultSession.setPermissionRequestHandler(onPermissionRequestHandler)
  ipcMain.on('permission-response', onPermissionResponseHandler)
}

export function denyAllRequests (win) {
  // remove all requests in the window, denying as we go 
  activeRequests = activeRequests.filter(req => {
    if (req.win === win) {
      log('Denying outstanding permission for closing window, req #'+req.id+' for '+req.permission)
      req.cb(false)
      return false
    }
    return true
  })
}

// event handlers
// =

function onPermissionRequestHandler (webContents, permission, cb) {
  // look up the containing window
  var win = BrowserWindow.fromWebContents(webContents.hostWebContents)
  if (!win)
    return log('Warning: failed to find containing window of permission request, '+permission)

  // if we're already tracking this kind of permission request, then bundle them
  var req = activeRequests.find(req => req.win === win && req.permission === permission)
  if (req) {
    var oldCb = req.cb
    req.cb = decision => { oldCb(decision); cb(decision) }
  } else {
    // track the new cb
    var req = { id: ++idCounter, win, permission, cb }
    activeRequests.push(req)
  }

  // send message to create the UI
  win.webContents.send('command', 'perms:prompt', req.id, webContents.id, permission)
}

function onPermissionResponseHandler (e, reqId, decision) {
  var win = e.sender

  // lookup the cb
  var req = activeRequests.find(req => req.id == reqId)
  if (!req)
    return log('Warning: failed to find permission request for response #'+reqId)

  // untrack
  activeRequests.splice(activeRequests.indexOf(req), 1)

  // hand down the decision
  var cb = req.cb
  cb(decision)
}
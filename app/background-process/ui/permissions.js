import { ipcMain, session, BrowserWindow } from 'electron'
import log from 'loglevel'
import * as siteData from '../dbs/sitedata'
import PERMS from '../../lib/perms'

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
      log.debug('Denying outstanding permission for closing window, req #'+req.id+' for '+req.permission)
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
    return log.warn('Warning: failed to find containing window of permission request, '+permission)
  const url = webContents.getURL()

  // check if the perm is disallowed
  const PERM = PERMS[permission]
  if (PERM && PERM.alwaysDisallow) return cb(false)

  // check the sitedatadb
  siteData.getPermission(url, permission).catch(err => false).then(res => {
    if (res === 1) {
      return cb(true)
    }

    // if we're already tracking this kind of permission request, then bundle them
    var req = activeRequests.find(req => req.win === win && req.permission === permission)
    if (req) {
      var oldCb = req.cb
      req.cb = decision => { oldCb(decision); cb(decision) }
    } else {
      // track the new cb
      var req = { id: ++idCounter, win, url, permission, cb }
      activeRequests.push(req)
    }

    // send message to create the UI
    win.webContents.send('command', 'perms:prompt', req.id, webContents.id, permission)
  })
}

function onPermissionResponseHandler (e, reqId, decision) {
  var win = e.sender

  // lookup the cb
  var req = activeRequests.find(req => req.id == reqId)
  if (!req)
    return log.warn('Warning: failed to find permission request for response #'+reqId)

  // untrack
  activeRequests.splice(activeRequests.indexOf(req), 1)

  // hand down the decision
  var cb = req.cb
  cb(decision)

  // persist approvals
  const PERM = PERMS[req.permission]
  if (decision && PERM && PERM.persist) {
    siteData.setPermission(req.url, req.permission, 1)
  }
}
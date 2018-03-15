import { ipcMain, session, BrowserWindow } from 'electron'
import * as siteData from '../dbs/sitedata'
import PERMS from '../../lib/perms'
import { getPermId } from '../../lib/strings'

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

export function requestPermission (permission, webContents, opts) {
  return new Promise((resolve, reject) => onPermissionRequestHandler(webContents, permission, resolve, opts))
}

export function grantPermission (permission, webContents) {
  var siteURL = (typeof webContents === 'string') ? webContents : webContents.getURL()

  // update the DB
  const PERM = PERMS[getPermId(permission)]
  if (PERM && PERM.persist) {
    siteData.setPermission(siteURL, permission, 1)
  }
  return Promise.resolve()
}

export function revokePermission (permission, webContents) {
  var siteURL = (typeof webContents === 'string') ? webContents : webContents.getURL()

  // update the DB
  const PERM = PERMS[getPermId(permission)]
  if (PERM && PERM.persist) {
    siteData.clearPermission(siteURL, permission)
  }
  return Promise.resolve()
}

export function queryPermission (permission, webContents) {
  return siteData.getPermission(webContents.getURL(), permission)
}

export function denyAllRequests (win) {
  // remove all requests in the window, denying as we go
  activeRequests = activeRequests.filter(req => {
    if (req.win === win) {
      req.cb(false)
      return false
    }
    return true
  })
}

// event handlers
// =

function onPermissionRequestHandler (webContents, permission, cb, opts) {
  // look up the containing window
  var win = getContainingWindow(webContents)
  if (!win) {
    console.error('Warning: failed to find containing window of permission request, ' + permission)
    return cb(false)
  }
  const url = webContents.getURL()

  // check if the perm is auto-allowed or auto-disallowed
  const PERM = PERMS[getPermId(permission)]
  if (PERM && PERM.alwaysAllow) return cb(true)
  if (PERM && PERM.alwaysDisallow) return cb(false)

  // check the sitedatadb
  siteData.getPermission(url, permission).catch(err => undefined).then(res => {
    if (res === 1) return cb(true)
    if (res === 0) return cb(false)

    // if we're already tracking this kind of permission request, then bundle them
    var req = activeRequests.find(req => req.win === win && req.permission === permission)
    if (req) {
      if (PERM.alwaysAsk) {
        // deny now
        return cb(false)
      }
      var oldCb = req.cb
      req.cb = decision => { oldCb(decision); cb(decision) }
    } else {
      // track the new cb
      req = { id: ++idCounter, win, url, permission, cb }
      activeRequests.push(req)
    }

    // send message to create the UI
    win.webContents.send('command', 'perms:prompt', req.id, webContents.id, permission, opts)
  })
}

async function onPermissionResponseHandler (e, reqId, decision) {
  // lookup the cb
  var req = activeRequests.find(req => req.id == reqId)
  if (!req) { return console.error('Warning: failed to find permission request for response #' + reqId) }

  // persist decisions
  const PERM = PERMS[getPermId(req.permission)]
  if (PERM && PERM.persist) {
    if (PERM.persist === 'allow' && !decision) {
      // only persist allows
      await siteData.clearPermission(req.url, req.permission)
    } else {
      // persist all decisions
      await siteData.setPermission(req.url, req.permission, decision)
    }
  }

  // untrack
  activeRequests.splice(activeRequests.indexOf(req), 1)

  // hand down the decision
  var cb = req.cb
  cb(decision)
}

function getContainingWindow (webContents) {
  return BrowserWindow.fromWebContents(webContents.hostWebContents)
}

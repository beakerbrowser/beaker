import { ipcMain, session, BrowserWindow } from 'electron'
var debug = require('debug')('beaker')
import rpc from 'pauls-electron-rpc'
import * as siteData from '../dbs/sitedata'
import PERMS from '../../lib/perms'
import { getPermId } from '../../lib/strings'
import manifest from '../../lib/api-manifests/external/permissions'

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

  // wire up RPC
  rpc.exportAPI('beakerPermissions', manifest, RPCAPI)
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
    siteData.setPermission(siteURL, permission, 0)
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
      debug('Denying outstanding permission-request for closing window, req #' + req.id + ' for ' + req.permission)
      req.cb(false)
      return false
    }
    return true
  })
}

// rpc api
// =

const RPCAPI = {
  requestPermission (permission) {
    return requestPermission(permission, this.sender)
  },
  revokePermission (permission) {
    return revokePermission(permission, this.sender)
  },
  queryPermission (permission) {
    return queryPermission(permission, this.sender)
  }
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
      req = { id: ++idCounter, win, url, permission, cb }
      activeRequests.push(req)
    }

    // send message to create the UI
    win.webContents.send('command', 'perms:prompt', req.id, webContents.id, permission, opts)
  })
}

function onPermissionResponseHandler (e, reqId, decision) {
  // lookup the cb
  var req = activeRequests.find(req => req.id == reqId)
  if (!req) { return console.error('Warning: failed to find permission request for response #' + reqId) }

  // untrack
  activeRequests.splice(activeRequests.indexOf(req), 1)

  // hand down the decision
  var cb = req.cb
  cb(decision)

  // persist approvals
  const PERM = PERMS[getPermId(req.permission)]
  if (decision && PERM && PERM.persist) {
    siteData.setPermission(req.url, req.permission, 1)
  }
}

function getContainingWindow (webContents) {
  return BrowserWindow.fromWebContents(webContents.hostWebContents)
}

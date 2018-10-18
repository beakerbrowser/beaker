import { ipcMain, session, BrowserWindow } from 'electron'
import * as beakerCore from '@beaker/core'
const dat = beakerCore.dat
const sitedata = beakerCore.dbs.sitedata
import _get from 'lodash.get'
import pda from 'pauls-dat-api'
import parseDatURL from 'parse-dat-url'
import PERMS from '../../lib/perms'
import {getPermId} from '@beaker/core/lib/strings'
import {PermissionsError, UserDeniedError} from 'beaker-error-constants'

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
    sitedata.setPermission(siteURL, permission, 1)
  }
  return Promise.resolve()
}

export function revokePermission (permission, webContents) {
  var siteURL = (typeof webContents === 'string') ? webContents : webContents.getURL()

  // update the DB
  const PERM = PERMS[getPermId(permission)]
  if (PERM && PERM.persist) {
    sitedata.clearPermission(siteURL, permission)
  }
  return Promise.resolve()
}

export function queryPermission (permission, webContents) {
  return sitedata.getPermission(webContents.getURL(), permission)
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

export async function checkLabsPerm ({perm, labApi, apiDocsUrl, sender}) {
  var urlp = parseDatURL(sender.getURL())
  if (urlp.protocol === 'beaker:') return true
  if (urlp.protocol === 'dat:') {
    // resolve name
    let key = await dat.dns.resolveName(urlp.hostname)

    // check dat.json for opt-in
    let isOptedIn = false
    let archive = dat.library.getArchive(key)
    if (archive) {
      let {checkoutFS} = dat.library.getArchiveCheckout(archive, urlp.version)
      let manifest = await pda.readManifest(checkoutFS).catch(_ => {})
      let apis = _get(manifest, 'experimental.apis')
      if (apis && Array.isArray(apis)) {
        isOptedIn = apis.includes(labApi)
      }
    }
    if (!isOptedIn) {
      throw new PermissionsError(`You must include "${labApi}" in your dat.json experimental.apis list. See ${apiDocsUrl} for more information.`)
    }

    // ask user
    let allowed = await requestPermission(perm, sender)
    if (!allowed) throw new UserDeniedError()
    return true
  }
  throw new PermissionsError()
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

  // always allow beaker:// origins
  if (url.startsWith('beaker://')) {
    return cb(true)
  }

  // check if the perm is auto-allowed or auto-disallowed
  const PERM = PERMS[getPermId(permission)]
  if (PERM && PERM.alwaysAllow) return cb(true)
  if (PERM && PERM.alwaysDisallow) return cb(false)

  // check the sitedatadb
  sitedata.getPermission(url, permission).catch(err => undefined).then(res => {
    if (res === 1) return cb(true)
    if (res === 0) return cb(false)

    // if we're already tracking this kind of permission request, and the perm is idempotent, then bundle them
    var req = PERM.idempotent ? activeRequests.find(req => req.win === win && req.permission === permission) : false
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
      await sitedata.clearPermission(req.url, req.permission)
    } else {
      // persist all decisions
      await sitedata.setPermission(req.url, req.permission, decision)
    }
  }

  // untrack
  activeRequests.splice(activeRequests.indexOf(req), 1)

  // hand down the decision
  var cb = req.cb
  cb(decision)
}

function getContainingWindow (webContents) {
  return BrowserWindow.fromWebContents(webContents.hostWebContents || webContents)
}

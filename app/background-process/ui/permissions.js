import { session, BrowserView } from 'electron'
import { PERMS, getPermId } from '@beaker/permissions'
import * as beakerCore from '@beaker/core'
const dat = beakerCore.dat
const sitedata = beakerCore.dbs.sitedata
import _get from 'lodash.get'
import parseDatURL from 'parse-dat-url'
import * as permPromptSubwindow from './subwindows/perm-prompt'
import * as viewManager from './view-manager'
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
      let {checkoutFS} = await dat.library.getArchiveCheckout(archive, urlp.version)
      let manifest = await checkoutFS.pda.readManifest().catch(_ => {})
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

async function onPermissionRequestHandler (webContents, permission, cb, opts) {
  const url = webContents.getURL()

  // always allow beaker:// origins
  if (url.startsWith('beaker://')) {
    return cb(true)
  }

  // HACK
  // until the applications system can be properly implemented,
  // allow all requests from dat://beaker.social/, our default social app
  // -prf
  if (url.startsWith('dat://beaker.social/') && permission === 'dangerousAppControl') {
    return cb(true)
  }

  // look up the containing window
  var {win, view} = getContaining(webContents)
  if (!win || !view) {
    console.error('Warning: failed to find containing window of permission request, ' + permission)
    return cb(false)
  }

  // check if the perm is auto-allowed or auto-disallowed
  const PERM = PERMS[getPermId(permission)]
  if (!PERM) return cb(false)
  if (PERM && PERM.alwaysAllow) return cb(true)
  if (PERM && PERM.alwaysDisallow) return cb(false)

  // check the sitedatadb
  var res = await sitedata.getPermission(url, permission).catch(err => undefined)
  if (res === 1) return cb(true)
  if (res === 0) return cb(false)

  // if we're already tracking this kind of permission request, and the perm is idempotent, then bundle them
  var req = PERM.idempotent ? activeRequests.find(req => req.view === view && req.permission === permission) : false
  if (req) {
    var oldCb = req.cb
    req.cb = decision => { oldCb(decision); cb(decision) }
    return
  } else {
    // track the new cb
    req = { id: ++idCounter, view, win, url, permission, cb }
    activeRequests.push(req)
  }

  // run the UI flow
  var decision = await permPromptSubwindow.create(win, view, {permission, url, opts})

  // persist decisions
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
  req.cb(decision)
}

function getContaining (webContents) {
  var view = BrowserView.fromWebContents(webContents)
  if (view) {
    var win = viewManager.findContainingWindow(view)
    return {win, view}
  }
  return {}
}

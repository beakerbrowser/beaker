import { session, BrowserView } from 'electron'
import { PERMS, getPermId } from '../../lib/permissions'
import hyper from '../hyper/index'
import * as sitedata from '../dbs/sitedata'
import _get from 'lodash.get'
import { parseDriveUrl } from '../../lib/urls'
import * as permPromptSubwindow from './subwindows/perm-prompt'
import * as tabManager from './tabs/manager'
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
      for (let cb of req.cbs) {
        cb(false)
      }
      return false
    }
    return true
  })
}

export async function checkLabsPerm ({perm, labApi, apiDocsUrl, sender}) {
  var urlp = parseDriveUrl(sender.getURL())
  if (urlp.protocol === 'beaker:') return true
  if (urlp.protocol === 'hyper:') {
    // resolve name
    let key = await hyper.dns.resolveName(urlp.hostname)

    // check index.json for opt-in
    let isOptedIn = false
    let drive = hyper.drives.getDrive(key)
    if (drive) {
      let {checkoutFS} = await hyper.drives.getDriveCheckout(drive, urlp.version)
      let manifest = await checkoutFS.pda.readManifest().catch(_ => {})
      let apis = _get(manifest, 'experimental.apis')
      if (apis && Array.isArray(apis)) {
        isOptedIn = apis.includes(labApi)
      }
    }
    if (!isOptedIn) {
      throw new PermissionsError(`You must include "${labApi}" in your index.json experimental.apis list. See ${apiDocsUrl} for more information.`)
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

  // check if the perm is auto-allowed or auto-disallowed
  const PERM = PERMS[getPermId(permission)]
  if (!PERM) return cb(false)
  if (PERM && PERM.alwaysAllow) return cb(true)
  if (PERM && PERM.alwaysDisallow) return cb(false)

  // special cases
  if (permission === 'openExternal' && opts.externalURL.startsWith('mailto:')) {
    return cb(true)
  }

  // check the sitedatadb
  var res = await sitedata.getPermission(url, permission).catch(err => undefined)
  if (res === 1) return cb(true)
  if (res === 0) return cb(false)

  // look up the containing window
  var {win, tab, view} = getContaining(webContents)
  if (!win || !view) {
    console.error('Warning: failed to find containing window of permission request, ' + permission)
    return cb(false)
  }

  // if we're already tracking this kind of permission request, and the perm is idempotent, then bundle them
  var req = PERM.idempotent ? activeRequests.find(req => req.view === view && req.permission === permission) : false
  if (req) {
    req.cbs.push(cb)
    return
  }

  // wait for any existing perm requests on the tab to finish
  await waitForPendingTabRequests(tab)
  
  // track the new cb
  req = { id: ++idCounter, view, tab, win, url, permission, cbs: [cb] }
  activeRequests.push(req)

  // run the UI flow
  tab.setActivePane(tab.findPane(view))
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
  for (let cb of req.cbs) {
    cb(decision)
  }
}

async function waitForPendingTabRequests (tab) {
  var reqs = activeRequests.filter(req => req.tab === tab)
  if (reqs.length === 0) return
  let promises = []
  for (let req of reqs) {
    promises.push(new Promise(resolve => req.cbs.push(resolve)))
  }
  await Promise.all(promises)
}

function getContaining (webContents) {
  var view = BrowserView.fromWebContents(webContents)
  if (view) {
    var tab = tabManager.findContainingTab(view)
    return {win: tab.browserWindow, tab, view}
  }
  return {}
}

/**
 * WebContents Trust tracker
 * 
 * This is a slightly bizarre system that's written in reaction to some electron limitations.
 *
 * We need a way to determine if a given webContents is currently viewing a "trusted interface."
 * Anything served by beaker:// is trusted, as is certain hyper:// resources which have a trusted
 * interface injected as the response (ie when it's not HTML and there's no custom frontend).
 * 
 * The way we determine whether a trusted interface was served by hyper:// is by examining the
 * response headers, which Jolly has control over for hyper:// requests. If 'Beaker-Trusted-Interface'
 * is present, then we know to mark the WC as viewing a trusted interface.
 * 
 * This knowledge needs to be tracked by each specific WC because there's the possibility that
 * a given URL changes its trusted status (fx a custom frontend is added). This would be easier
 * if Electron consistently told us the webContentsId of responses in the session.webRequests module,
 * but it does not. Therefore we have to manually track each webContents and match the responses
 * to the webContents. We do that by marking any WC's trust as "unknown" when a navigation starts
 * and noting the target URL. When the target URL is loaded, we find the WC with "unknown" trust
 * and the same target URL and then update the trust-rating accordingly.
 * 
 * If a WC is trusted, it can be treated as beaker's internal code and therefore receive its
 * permissions.
 * 
 * NOTES
 *  - This only tracks the mainframe, and so any non-mainframe (eg an iframe) should *not*
 *    be given trust through this system. This means iframes cant run trusted code, for now.
 */

import { app } from 'electron'

export const TRUST = {
  UNKNOWN: -1,
  UNTRUSTED: 0,
  TRUSTED: 1
}

// globals
// =

var wcInfos = {}

// exported api
// =

export function setup () {
  app.on('web-contents-created', (e, wc) => trackWc(wc))
}

export function isWcTrusted (wc) {
  var wcid = (typeof wc === 'number') ? wc : wc.id
  return wcInfos[wcid]?.trust === TRUST.TRUSTED
}

export function setWcTrust (wc, trust) {
  var wcid = (typeof wc === 'number') ? wc : wc.id
  wcInfos[wcid] = {id: wcid, url: wc.getURL(), trust}
}

export function onWebRequestCompleted (details) {
  if (details.resourceType === 'mainFrame') {
    // find the wc going to this URL with no trust currently assigned
    var wcInfo
    for (let id in wcInfos) {
      if (wcInfos[id].trust === TRUST.UNKNOWN && wcInfos[id].url === details.url) {
        wcInfo = wcInfos[id]
        break
      }
    }
    if (!wcInfo) {
      return
    }
    if (details.url.startsWith('beaker://')) {
      wcInfo.trust = TRUST.TRUSTED
    } else if (details.url.startsWith('hyper://') && details.responseHeaders['Beaker-Trusted-Interface']) {
      wcInfo.trust = TRUST.TRUSTED
    } else {
      wcInfo.trust = TRUST.UNTRUSTED
    }
  }
}

// internal methods
// =

function trackWc (wc) {
  const id = wc.id
  wcInfos[id] = {id, url: undefined, trust: TRUST.UNKNOWN}
  wc.on('did-start-navigation', (e, url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) {
      // reset trust info
      wcInfos[id].url = url
      wcInfos[id].trust = TRUST.UNKNOWN
    }
  })
  wc.on('destroyed', e => {
    delete wcInfos[id]
  })
}
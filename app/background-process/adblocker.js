import { session } from 'electron'
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from 'node-fetch'

// exported API

export function setup () {
  // Initializes an adblocker engine targeted at ads only (for extra tracking
  // protection, `ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)` can be
  // used instead). The following lists are used with this preset:
  //
  // - Easylist: https://easylist.to/easylist/easylist.txt
  // - Peter Lowe adservers list: https://pgl.yoyo.org/adservers/
  // - uBlock Origin (resource abuse): https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt
  // - uBlock Origin (filters): https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt
  // - uBlock Origin (unbreak): https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt
  //
  // Currently the resources are downloaded (less than 2 MB of data) every time
  // Beaker starts, but could be cached locally in the future.
  ElectronBlocker.fromPrebuiltAdsOnly(fetch).then((blocker) => {
    // Calling this function will perform the following actions in order to
    // enable adblocking in Beaker:
    //
    // - register listener to `webRequest.onHeadersReceived`
    // - register listener to `webRequest.onBeforeRequest`
    // - register a content script with `setPreloads` which allows to block
    //   some extra ads which cannot be blocked by network filtering alone
    blocker.enableBlockingInSession(session.defaultSession)
  })
}

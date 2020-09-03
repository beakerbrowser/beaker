import { FiltersEngine, Request } from '@cliqz/adblocker'
import fetch from 'cross-fetch'
import * as settingsDb from '../bg/dbs/settings'

const beakerUrls = /^(beaker|blob)/

// globals
// =

var blocker

// exported API
// =

export async function setup () {
  const adblockLists = await settingsDb.get('adblock_lists')
  const activeLists = adblockLists.filter(list => list.selected)

  blocker = undefined
  if (activeLists.length >= 1) {
    blocker = await FiltersEngine.fromLists(fetch, activeLists.map(list => list.url))
  }
}

export function onBeforeRequest (details, callback) {
  if (!blocker) {
    return callback({cancel: false})
  }

  // Matching network filters
  const {
    match, // `true` if there is a match
    redirect, // data url to redirect to if any
    // exception, // instance of NetworkFilter exception if any
    // filter, // instance of NetworkFilter which matched
  } = blocker.match(Request.fromRawDetails({ url: details.url }))
  const shouldBeBlocked = !details.url.match(beakerUrls) && match
  callback({cancel: shouldBeBlocked, redirectURL: redirect})
}
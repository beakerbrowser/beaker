import { session } from 'electron'
import { initialize, containsAds } from 'contains-ads'

// exported API

export function setup () {
  initialize() // contains-ads

  const beakerUrls =  /^(beaker|blob)/
  // session.defaultSession.webRequest.onBeforeRequest(['*://*./*'], (details, callback) => {
  //   const shouldBeBlocked = !details.url.match(beakerUrls) && isAd(details.url)

  //   if (shouldBeBlocked) {
  //     callback({cancel: true})
  //   } else {
  //     callback({cancel: false})
  //   }
  // })
}
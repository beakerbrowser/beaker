import { session } from 'electron'
import { initialize, isAd } from 'is-ad'

// exported API

export function setup () {
  initialize() // is-ad

  const beakerUrls =  /^(beaker|blob)/
  session.defaultSession.webRequest.onBeforeRequest(['*://*./*'], (details, callback) => {
    const shouldBeBlocked = !details.url.match(beakerUrls) && isAd(details.url)

    if (shouldBeBlocked) {
      callback({cancel: true})
    } else {
      callback({cancel: false})
    }
  })
}
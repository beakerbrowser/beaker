import { session } from 'electron'
// import { initialize, containsAds } from 'contains-ads'

// exported API

export function setup () {
  /*
  temporarily disabled due to https://github.com/bbondy/bloom-filter-cpp/issues/7
    "contains-ads": "^0.2.5",

  initialize() // contains-ads

  const beakerUrls = /^(beaker|blob)/
  session.defaultSession.webRequest.onBeforeRequest(['*://*./*'], (details, callback) => {
    const shouldBeBlocked = !details.url.match(beakerUrls) && containsAds(details.url)

    if (shouldBeBlocked) {
      callback({cancel: true})
    } else {
      callback({cancel: false})
    }
  })
  */
}

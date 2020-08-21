import { session } from 'electron'
import { FiltersEngine, Request } from '@cliqz/adblocker'
import fetch from 'cross-fetch';

// exported API

export async function setup () {
  const blocker = await FiltersEngine.fromLists(fetch, [
    'https://easylist.to/easylist/easylist.txt'
  ])

  const beakerUrls = /^(beaker|blob)/
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    // Matching network filters
    const {
      match, // `true` if there is a match
      redirect, // data url to redirect to if any
      // exception, // instance of NetworkFilter exception if any
      // filter, // instance of NetworkFilter which matched
    } = blocker.match(Request.fromRawDetails({ url: details.url }))

    const shouldBeBlocked = !details.url.match(beakerUrls) && match

    let response = {
      cancel: shouldBeBlocked,
    }
    if (redirect) {
      response.redirectURL = redirect
    }

    callback(response);
  })
}

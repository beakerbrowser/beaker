import {protocol} from 'electron'
import querystring from 'querystring'
import errorPage from '../lib/error-page'
import intoStream from 'into-stream'

// exported api
// =

export function setup () {
  // setup the protocol handler
  protocol.registerStreamProtocol('intent', intentProtocol)
}

// internal
// =

function intentProtocol (request, respond) {
  var urlp = parseIntentUrl(request.url)
  if (!urlp) {
    respond({
      statusCode: 404,
      headers: {'Content-Type': 'text/html; charset=utf-8'},
      data: intoStream(errorPage('400 Invalid Intent URL'))
    })
  }
  // DEBUG
  // we have temporarily hardcoded the intents
  // -prf
  switch (urlp.name) {
    case 'unwalled.garden/view-profile':
      return respond({
        statusCode: 303,
        headers: {Location: `dat://beaker.social/profile/${encodeURIComponent(urlp.qs.url)}`},
        data: intoStream('')
      })
    case 'unwalled.garden/view-address-book':
      return respond({
        statusCode: 303,
        headers: {Location: `beaker://library/?view=addressbook&site=${encodeURIComponent(urlp.qs.url)}`},
        data: intoStream('')
      })
    case 'unwalled.garden/view-feed':
      return respond({
        statusCode: 303,
        headers: {Location: `dat://beaker.social/profile/${encodeURIComponent(urlp.qs.url)}`},
        data: intoStream('')
      })
    case 'unwalled.garden/view-file':
      return respond({
        statusCode: 303,
        headers: {Location: `beaker://editor/${urlp.qs.url}`},
        data: intoStream('')
      })
  }

  respond({
    statusCode: 404,
    headers: {'Content-Type': 'text/html; charset=utf-8'},
    data: intoStream(errorPage('404 Intent Not Found: ' + urlp.name))
  })
}

const intentUrlRegex = /^intent:([^?]+)\??(.*)$/i
function parseIntentUrl (url) {
  var match = intentUrlRegex.exec(url)
  if (!match) return false
  return {
    name: match[1],
    qs: querystring.parse(match[2])
  }
}
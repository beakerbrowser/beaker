import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
var debug = require('debug')('dat')
import pda from 'pauls-dat-api'
const datDns = require('dat-dns')()

import {ProtocolSetupError} from 'beaker-error-constants'
import * as datLibrary from '../networks/dat/library'
import * as sitedataDb from '../dbs/sitedata'
import directoryListingPage from '../networks/dat/directory-listing-page'
import errorPage from '../../lib/error-page'
import * as mime from '../../lib/mime'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 5e3 // 5 seconds

// content security policies
const DAT_CSP = `
default-src 'self' dat:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' dat:;
style-src 'self' 'unsafe-inline' dat:;
img-src 'self' data: dat:;
object-src 'none';
`.replace(/\n/g, ' ')

const CUSTOM_DAT_CSP = origins => {
  if (Array.isArray(origins)) origins = origins.map(o => `http://${o} https://${o}`).join(' ')
  else origins = ''
  return `
default-src 'self' dat:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' dat:;
style-src 'self' 'unsafe-inline' dat:;
img-src 'self' data: dat: ${origins};
font-src 'self' dat: ${origins};
media-src 'self' dat: ${origins}; 
connect-src 'self' dat: ${origins};
object-src 'none';
`.replace(/\n/g, ' ')
}

// globals
// =

var serverPort // port assigned to us
var requestNonce // used to limit access to the server from the outside

// exported api
// =

export function setup () {
  // generate a secret nonce
  requestNonce = crypto.randomBytes(4).readUInt32LE(0)

  // setup the network & db
  datLibrary.setup()

  // setup the protocol handler
  protocol.registerHttpProtocol('dat',
    (request, cb) => {
      // send requests to the protocol server
      cb({
        method: request.method,
        url: 'http://localhost:' + serverPort + '/?url=' + encodeURIComponent(request.url) + '&nonce=' + requestNonce
      })
    }, err => {
      if (err) throw ProtocolSetupError(err, 'Failed to create protocol: dat')
    }
  )

  // create the internal dat HTTP server
  var server = http.createServer(datServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (_, port) => { serverPort = port })
}

export function getServerInfo () {
  return {serverPort, requestNonce}
}

async function datServer (req, res) {
  var cb = once((code, status) => {
    res.writeHead(code, status, {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "default-src 'unsafe-inline';",
      'Access-Control-Allow-Origin': '*'
    })
    res.end(errorPage(code + ' ' + status))
  })
  var queryParams = url.parse(req.url, true).query
  var fileReadStream
  var headersSent = false

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce != requestNonce) {
    return cb(403, 'Forbidden')
  }

  // validate request
  var urlp = url.parse(queryParams.url)
  if (!urlp.host) {
    return cb(404, 'Archive Not Found')
  }
  if (req.method !== 'GET') {
    return cb(405, 'Method Not Supported')
  }

  // stateful vars that may need cleanup
  var timeout
  function cleanup () {
    if (timeout) {
      clearTimeout(timeout)
    }
  }

  // track whether the request has been aborted by client
  // if, after some async, we find `aborted == true`, then we just stop
  var aborted = false
  req.once('aborted', () => {
    aborted = true
    cleanup()
    debug('Request aborted by client')
  })

  // resolve the name
  // (if it's a hostname, do a DNS lookup)
  try {
    var archiveKey = await datDns.resolveName(urlp.host)
    if (aborted) return
  } catch (err) {
    cleanup()
    return cb(404, 'No DNS record found for ' + urlp.host)
  }

  // setup a timeout
  timeout = setTimeout(() => {
    if (aborted) return

    // cleanup
    aborted = true
    debug('Timed out searching for', archiveKey)
    var hadFileReadStream = !!fileReadStream
    if (fileReadStream) {
      fileReadStream.destroy()
      fileReadStream = null
    }

    // error page
    cb(404, 'Not found')
  }, REQUEST_TIMEOUT_MS)

  try {
    // start searching the network
    var archive = await datLibrary.getOrLoadArchive(archiveKey)
    if (aborted) return
  } catch (err) {
    debug('Failed to open archive', archiveKey, err)
    cleanup()
    return cb(500, 'Failed')
  }

  // lookup entry
  debug('attempting to lookup', archiveKey)
  var filepath = decodeURIComponent(urlp.path)
  if (!filepath) filepath = '/'
  if (filepath.indexOf('?') !== -1) filepath = filepath.slice(0, filepath.indexOf('?')) // strip off any query params
  var isFolder = filepath.endsWith('/')
  var entry
  const tryStat = async (path) => {
    if (entry) return
    try {
      entry = await pda.stat(archive, path)
      entry.path = path
    } catch (e) {}
  }
  if (isFolder) {
    await tryStat(filepath + 'index.html')
    await tryStat(filepath + 'index.md')
    await tryStat(filepath)
  } else {
    await tryStat(filepath)
    await tryStat(filepath + '.html') // fallback to .html
  }

  // still serving?
  if (aborted) return

  // handle folder
  if ((!entry && isFolder) || (entry && entry.isDirectory())) {
    cleanup()
    res.writeHead(200, 'OK', {
      'Content-Type': 'text/html',
      'Content-Security-Policy': DAT_CSP,
      'Access-Control-Allow-Origin': '*'
    })
    res.end(await directoryListingPage(archive, urlp.path))
  }

  // handle not found
  if (!entry) {
    debug('Entry not found:', urlp.path)
    cleanup()
    return cb(404, 'File Not Found')
  }
  
  // caching if-match
  // TODO
  // this unfortunately caches the CSP header too
  // we'll need the etag to change when CSP perms change
  // TODO- try including all headers...
  // -prf
  // const ETag = 'block-' + entry.content.blockOffset
  // if (req.headers['if-none-match'] === ETag) {
  //   return cb(304, 'Not Modified')
  // }

  // fetch the permissions
  var origins
  try {
    origins = await sitedataDb.getNetworkPermissions('dat://' + archiveKey)
  } catch (e) {
    origins = []
  }

  // fetch the entry and stream the response
  debug('Entry found:', entry.path)
  fileReadStream = archive.createReadStream(entry.path)
  fileReadStream
    .pipe(mime.identifyStream(entry.path, mimeType => {
      // cleanup the timeout now, as bytes have begun to stream
      cleanup()

      // send headers, now that we can identify the data
      headersSent = true
      var headers = {
        'Content-Type': mimeType,
        'Content-Security-Policy': CUSTOM_DAT_CSP(origins),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age: 60'
        // ETag
      }
      if (entry.size) headers['Content-size'] = entry.length
      res.writeHead(200, 'OK', headers)
    }))
    .pipe(res)

  // handle empty files
  fileReadStream.once('end', () => {
    if (!headersSent) {
      cleanup()
      debug('Served empty file')
      res.writeHead(200, 'OK', {
        'Content-Security-Policy': DAT_CSP,
        'Access-Control-Allow-Origin': '*'
      })
      res.end('\n')
      // TODO
      // for some reason, sending an empty end is not closing the request
      // this may be an issue in beaker's interpretation of the page-load ?
      // but Im solving it here for now, with a '\n'
      // -prf
    }
  })

  // handle read-stream errors
  fileReadStream.once('error', err => {
    debug('Error reading file', err)
    if (!headersSent) cb(500, 'Failed to read file')
  })

  // abort if the client aborts
  req.once('aborted', () => {
    if (fileReadStream) {
      fileReadStream.destroy()
    }
  })
}

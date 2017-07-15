import { protocol } from 'electron'
import {parse as parseUrl} from 'url'
import {join as joinPaths} from 'path'
import parseDatUrl from 'parse-dat-url'
import parseRange from 'range-parser'
import once from 'once'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
var debug = require('debug')('dat')
import pda from 'pauls-dat-api'
import toZipStream from 'hyperdrive-to-zip-stream'
import slugify from 'slugify'

import {ProtocolSetupError} from 'beaker-error-constants'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as sitedataDb from '../dbs/sitedata'
import directoryListingPage from '../networks/dat/directory-listing-page'
import errorPage from '../../lib/error-page'
import * as mime from '../../lib/mime'

// HACK
// attempt to load utp-native to make sure it's correctly built
// discovery-swarm intentionally swallows that failure but we want
// it to be logged
// -prf
try {
  require('utp-native')
} catch (err) {
  console.error('Failed to load utp-native. Peer-to-peer connectivity may be degraded.', err)
}

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30 seconds

// content security policies
const DAT_CSP = `
default-src 'self' dat: blob:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' dat: blob:;
style-src 'self' 'unsafe-inline' dat: blob:;
img-src 'self' data: dat: blob:;
font-src 'self' data: dat: blob:;
object-src 'none';
`.replace(/\n/g, ' ')

const CUSTOM_DAT_CSP = origins => {
  if (Array.isArray(origins)) origins = origins.map(o => `http://${o} https://${o}`).join(' ')
  else origins = ''
  return `
default-src 'self' dat: blob:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' dat: blob:;
style-src 'self' 'unsafe-inline' dat: blob:;
img-src 'self' data: dat: ${origins} blob:;
font-src 'self' data: dat: ${origins} blob:;
media-src 'self' dat: ${origins} blob:;
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
  var cb = once((code, status, errorPageInfo) => {
    res.writeHead(code, status, {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "default-src 'unsafe-inline' beaker:;",
      'Access-Control-Allow-Origin': '*'
    })
    res.end(errorPage(errorPageInfo || (code + ' ' + status)))
  })
  var queryParams = parseUrl(req.url, true).query
  var fileReadStream
  var headersSent = false
  var archive

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce != requestNonce) {
    return cb(403, 'Forbidden')
  }

  // validate request
  var urlp = parseDatUrl(queryParams.url, true)
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
    var archiveKey = await datDns.resolveName(urlp.host, {ignoreCachedMiss: true})
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
    if (fileReadStream) {
      fileReadStream.destroy()
      fileReadStream = null
    }

    // error page
    var resource = archive ? 'page' : 'site'
    cb(504, `Timed out searching for ${resource}`, {
      resource,
      errorCode: 'dat-timeout',
      validatedURL: urlp.href
    })
  }, REQUEST_TIMEOUT_MS)

  try {
    // start searching the network
    archive = await datLibrary.getOrLoadArchive(archiveKey)
    if (aborted) return
  } catch (err) {
    debug('Failed to open archive', archiveKey, err)
    cleanup()
    return cb(500, 'Failed')
  }

  // parse path
  var filepath = decodeURIComponent(urlp.path)
  if (!filepath) filepath = '/'
  if (filepath.indexOf('?') !== -1) filepath = filepath.slice(0, filepath.indexOf('?')) // strip off any query params
  var isFolder = filepath.endsWith('/')

  // checkout version if needed
  var archiveFS = archive.stagingFS
  if (urlp.version) {
    let seq = +urlp.version
    if (seq <= 0) {
      return cb(404, 'Version too low')
    }
    if (seq > archive.version) {
      return cb(404, 'Version too high')
    }
    archiveFS = archive.checkout(seq)
  }

  // read the manifest (it's needed in a couple places)
  var manifest
  try { manifest = await pda.readManifest(archiveFS) } catch (e) { manifest = null }

  // handle zip download
  if (urlp.query.download_as === 'zip') {
    cleanup()

    // (try to) get the title from the manifest
    let zipname = false
    if (manifest) {
      zipname = slugify(manifest.title || '').toLowerCase()
    }
    zipname = zipname || 'archive'

    // serve the zip
    res.writeHead(200, 'OK', {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipname}.zip"`,
      'Content-Security-Policy': DAT_CSP,
      'Access-Control-Allow-Origin': '*'
    })
    var zs = toZipStream(archive)
    zs.on('error', err => console.log('Error while producing .zip file', err))
    zs.pipe(res)
    return
  }

  // lookup entry
  debug('Attempting to lookup', archiveKey, filepath)
  var statusCode = 200
  var entry
  const tryStat = async (path) => {
    // abort if we've already found it
    if (entry) return
    // apply the web_root config
    if (manifest && manifest.web_root) {
      if (path) {
        path = joinPaths(manifest.web_root, path)
      } else {
        path = manifest.web_root
      }
    }
    // attempt lookup
    try {
      entry = await pda.stat(archiveFS, path)
      entry.path = path
    } catch (e) {}
  }
  // detect if this is a folder without a trailing slash
  if (!isFolder) {
    await tryStat(filepath)
    if (entry && entry.isDirectory()) {
      filepath = filepath + '/'
      isFolder = true
    }
  }
  entry = false
  // do actual lookup
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
    return res.end(await directoryListingPage(archiveFS, filepath, manifest && manifest.web_root))
  }

  // handle not found
  if (!entry) {
    statusCode = 404
    debug('Entry not found:', urlp.path)

    // check for a fallback page
    await tryStat(manifest.fallback_page)

    if (!entry) {
      cleanup()
      return cb(404, 'File Not Found')
    }
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

  // handle range
  res.setHeader('Accept-Ranges', 'bytes')
  var range = req.headers.range && parseRange(entry.size, req.headers.range)
  if (range && range.type === 'bytes') {
    range = range[0] // only handle first range given
    statusCode = 206
    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + entry.size)
    res.setHeader('Content-Length', range.end - range.start + 1)
    debug('Serving range:', range)
  } else {
    if (entry.size) {
      res.setHeader('Content-Length', entry.size)
    }
  }

  // fetch the entry and stream the response
  debug('Entry found:', entry.path)
  fileReadStream = archiveFS.createReadStream(entry.path, range)
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
      res.writeHead(statusCode, 'OK', headers)
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

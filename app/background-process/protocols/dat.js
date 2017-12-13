import {protocol} from 'electron'
import {join as joinPaths} from 'path'
import parseDatUrl from 'parse-dat-url'
import parseRange from 'range-parser'
import once from 'once'
var debug = require('debug')('datserve')
import pda from 'pauls-dat-api'
import intoStream from 'into-stream'
import toZipStream from 'hyperdrive-to-zip-stream'
import slugify from 'slugify'

import {ProtocolSetupError} from 'beaker-error-constants'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
// import * as sitedataDb from '../dbs/sitedata'
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
default-src dat: https: wss: data: blob:;
script-src dat: https: 'unsafe-eval' 'unsafe-inline' data: blob:;
style-src dat: https: 'unsafe-inline' data: blob:;
object-src 'none';
`.replace(/\n/g, ' ')

// exported api
// =

export function setup () {
  // setup the network & db
  datLibrary.setup()

  // setup the protocol handler
  protocol.registerStreamProtocol('dat', datProtocol, err => {
    if (err) throw ProtocolSetupError(err, 'Failed to create protocol: dat')
  })
}

async function datProtocol (request, respond) {
  var respondError = once((code, status, errorPageInfo) => {
    respond({
      statusCode: code,
      headers: {
        'Content-Type': 'text/html',
        'Content-Security-Policy': "default-src 'unsafe-inline' beaker:;",
        'Access-Control-Allow-Origin': '*'
      },
      data: intoStream(errorPage(errorPageInfo || (code + ' ' + status)))
    })
  })
  var fileReadStream
  var headersSent = false
  var archive

  // validate request
  var urlp = parseDatUrl(request.url, true)
  if (!urlp.host) {
    return respondError(404, 'Archive Not Found')
  }
  if (request.method !== 'GET') {
    return respondError(405, 'Method Not Supported')
  }

  // resolve the name
  // (if it's a hostname, do a DNS lookup)
  try {
    var archiveKey = await datDns.resolveName(urlp.host, {ignoreCachedMiss: true})
  } catch (err) {
    return respondError(404, 'No DNS record found for ' + urlp.host)
  }

  // setup a timeout
  var timeout
  const cleanup = () => clearTimeout(timeout)
  timeout = setTimeout(() => {
    // cleanup
    debug('Timed out searching for', archiveKey)
    if (fileReadStream) {
      fileReadStream.destroy()
      fileReadStream = null
    }

    // error page
    var resource = archive ? 'page' : 'site'
    respondError(504, `Timed out searching for ${resource}`, {
      resource,
      errorCode: 'dat-timeout',
      validatedURL: urlp.href
    })
  }, REQUEST_TIMEOUT_MS)

  try {
    // start searching the network
    archive = await datLibrary.getOrLoadArchive(archiveKey)
  } catch (err) {
    debug('Failed to open archive', archiveKey, err)
    cleanup()
    return respondError(500, 'Failed')
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
      return respondError(404, 'Version too low')
    }
    if (seq > archive.version) {
      return respondError(404, 'Version too high')
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
    var zs = toZipStream(archive)
    zs.on('error', err => console.log('Error while producing .zip file', err))
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipname}.zip"`,
        'Content-Security-Policy': DAT_CSP,
        'Access-Control-Allow-Origin': '*'
      },
      data: zs
    })
  }

  // lookup entry
  debug('Attempting to lookup', archiveKey, filepath)
  var statusCode = 200
  var headers = {}
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

  // handle folder
  if (entry && entry.isDirectory()) {
    cleanup()
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Security-Policy': DAT_CSP,
        'Access-Control-Allow-Origin': '*'
      },
      data: intoStream(await directoryListingPage(archiveFS, filepath, manifest && manifest.web_root))
    })
  }

  // handle not found
  if (!entry) {
    debug('Entry not found:', urlp.path)

    // check for a fallback page
    if (manifest) {
      await tryStat(manifest.fallback_page)
    }

    if (!entry) {
      cleanup()
      return respondError(404, 'File Not Found')
    }
  }

  // caching if-match
  // TODO
  // this unfortunately caches the CSP header too
  // we'll need the etag to change when CSP perms change
  // TODO- try including all headers...
  // -prf
  // const ETag = 'block-' + entry.content.blockOffset
  // if (request.headers['if-none-match'] === ETag) {
  //   return respondError(304, 'Not Modified')
  // }

  // fetch the permissions
  // TODO this has been disabled until we can create a better UX -prf
  // var origins
  // try {
  //   origins = await sitedataDb.getNetworkPermissions('dat://' + archiveKey)
  // } catch (e) {
  //   origins = []
  // }

  // handle range
  headers['Accept-Ranges'] = 'bytes'
  var range = request.headers.range && parseRange(entry.size, request.headers.range)
  if (range && range.type === 'bytes') {
    range = range[0] // only handle first range given
    statusCode = 206
    headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + entry.size
    headers['Content-Length'] = range.end - range.start + 1
    debug('Serving range:', range)
  } else {
    if (entry.size) {
      headers['Content-Length'] = entry.size
    }
  }

  // fetch the entry and stream the response
  debug('Entry found:', entry.path)
  fileReadStream = archiveFS.createReadStream(entry.path, range)
  var dataStream = fileReadStream
    .pipe(mime.identifyStream(entry.path, mimeType => {
      // cleanup the timeout now, as bytes have begun to stream
      cleanup()

      // send headers, now that we can identify the data
      headersSent = true
      Object.assign(headers, {
        'Content-Type': mimeType,
        'Content-Security-Policy': DAT_CSP,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age: 60'
        // ETag
      })
      respond({
        statusCode,
        headers,
        data: dataStream
      })
    }))

  // handle empty files
  fileReadStream.once('end', () => {
    if (!headersSent) {
      cleanup()
      debug('Served empty file')
      respond({
        statusCode: 200,
        headers: {
          'Content-Security-Policy': DAT_CSP,
          'Access-Control-Allow-Origin': '*'
        },
        data: intoStream('')
      })
    }
  })

  // handle read-stream errors
  fileReadStream.once('error', err => {
    debug('Error reading file', err)
    if (!headersSent) respondError(500, 'Failed to read file')
  })
}

import { parseDriveUrl } from '../../lib/urls'
import parseRange from 'range-parser'
import once from 'once'
import * as logLib from '../logger'
const logger = logLib.child({category: 'hyper', subcategory: 'hyper-scheme'})
// import intoStream from 'into-stream'
import { toZipStream } from '../lib/zip'
import slugify from 'slugify'
import markdown from '../../lib/markdown'
import hyperDns from '../hyper/dns'
import * as drives from '../hyper/drives'
import datServeResolvePath from '@beaker/dat-serve-resolve-path'
import errorPage from '../lib/error-page'
import * as mime from '../lib/mime'

const md = markdown({
  allowHTML: true,
  useHeadingIds: true,
  useHeadingAnchors: false,
  hrefMassager: undefined,
  highlight: undefined
})

/**
 * HACK
 * Electron has an issue that's causing file read streams to fail to serve
 * Reading into memory seems to resolve the issue
 * https://github.com/electron/electron/issues/21018
 * -prf
 */
import { PassThrough } from 'stream'
function intoStream (text) {
  const rv = new PassThrough()
  rv.push(text)
  rv.push(null)
  return rv
}

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30 seconds

// exported api
// =

export function register (protocol) {
  protocol.registerStreamProtocol('hyper', protocolHandler)
}

export const protocolHandler = async function (request, respond) {
  respond = once(respond)
  var respondError = (code, status, errorPageInfo) => {
    if (errorPageInfo) {
      errorPageInfo.validatedURL = request.url
      errorPageInfo.errorCode = code
    }
    var accept = request.headers.Accept || ''
    if (accept.includes('text/html')) {
      respond({
        statusCode: code,
        headers: {
          'Content-Type': 'text/html',
          'Content-Security-Policy': "default-src 'unsafe-inline' beaker:;",
          'Access-Control-Allow-Origin': '*'
        },
        data: intoStream(errorPage(errorPageInfo || (code + ' ' + status)))
      })
    } else {
      respond({statusCode: code})
    }
  }
  var fileReadStream
  var headersSent = false
  var drive
  var cspHeader = undefined

  // validate request
  var urlp = parseDriveUrl(request.url, true)
  if (!urlp.host) {
    return respondError(404, 'Drive Not Found', {
      title: 'Site Not Found',
      errorDescription: 'Invalid URL',
      errorInfo: `${request.url} is an invalid hyper:// URL`
    })
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return respondError(405, 'Method Not Supported')
  }

  // resolve the name
  // (if it's a hostname, do a DNS lookup)
  try {
    var driveKey = await hyperDns.resolveName(urlp.host, {ignoreCachedMiss: true})
  } catch (err) {
    return respondError(404, 'No DNS record found for ' + urlp.host, {
      errorDescription: 'No DNS record found',
      errorInfo: `No DNS record found for hyper://${urlp.host}`
    })
  }

  // setup a timeout
  var timeout
  const cleanup = () => clearTimeout(timeout)
  timeout = setTimeout(() => {
    // cleanup
    logger.debug('Timed out searching for', {url: driveKey})
    if (fileReadStream) {
      fileReadStream.destroy()
      fileReadStream = null
    }

    // error page
    var resource = drive ? 'page' : 'site'
    respondError(504, `Timed out searching for ${resource}`, {
      resource,
      validatedURL: urlp.href
    })
  }, REQUEST_TIMEOUT_MS)

  try {
    // start searching the network
    drive = await drives.getOrLoadDrive(driveKey)
  } catch (err) {
    logger.warn('Failed to open drive', {url: driveKey, err})
    cleanup()
    return respondError(500, 'Failed')
  }

  // parse path
  var filepath = decodeURIComponent(urlp.path)
  if (!filepath) filepath = '/'
  if (filepath.indexOf('?') !== -1) filepath = filepath.slice(0, filepath.indexOf('?')) // strip off any query params
  var hasTrailingSlash = filepath.endsWith('/')

  // checkout version if needed
  try {
    var {checkoutFS} = await drives.getDriveCheckout(drive, urlp.version)
  } catch (err) {
    logger.warn('Failed to open drive checkout', {url: driveKey, err})
    cleanup()
    return respondError(500, 'Failed')
  }

  // read the manifest (it's needed in a couple places)
  var manifest
  try { manifest = await checkoutFS.pda.readManifest() } catch (e) { manifest = null }

  // read type and configure
  const canExecuteHTML = true // TODO may need to be false for mounts

  // read manifest CSP
  if (manifest && manifest.content_security_policy && typeof manifest.content_security_policy === 'string') {
    cspHeader = manifest.content_security_policy
  }

  // check for the presence of a frontend
  var frontend = false
  if (await checkoutFS.pda.stat('/.ui/ui.html').catch(e => false)) {
    frontend = true
  }
  const serveFrontendHTML = async () => {
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Content-Security-Policy': cspHeader
      },
      data: intoStream(await checkoutFS.pda.readFile('/.ui/ui.html')) // TODO use stream
    })
  }

  // handle zip download
  if (urlp.query.download_as === 'zip') {
    cleanup()

    // (try to) get the title from the manifest
    let zipname = false
    if (manifest) {
      zipname = slugify(manifest.title || '').toLowerCase()
    }
    zipname = zipname || 'drive'

    let headers = {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipname}.zip"`,
      'Content-Security-Policy': cspHeader,
      'Access-Control-Allow-Origin': '*'
    }

    if (request.method === 'HEAD') {
      // serve the headers
      return respond({
        statusCode: 204,
        headers,
        data: intoStream('')
      })
    } else {
      // serve the zip
      var zs = toZipStream(checkoutFS, filepath)
      zs.on('error', err => logger.error('Error while producing .zip file', err))
      return respond({
        statusCode: 200,
        headers,
        data: zs
      })
    }
  }

  // lookup entry
  var statusCode = 200
  var headers = {}
  var entry = await datServeResolvePath(checkoutFS.pda, manifest, urlp, request.headers.Accept)

  // handle folder
  if (entry && entry.isDirectory()) {
    cleanup()

    // make sure there's a trailing slash
    if (!hasTrailingSlash) {
      return respond({
        statusCode: 200,
        headers: {'Content-Type': 'text/html'},
        data: intoStream(`<!doctype html><meta http-equiv="refresh" content="0; url=hyper://${urlp.host}${urlp.version ? ('+' + urlp.version) : ''}${urlp.pathname || ''}/${urlp.search || ''}">`)
      })
    }

    // frontend
    if (frontend) {
      return serveFrontendHTML()
    }

    // directory listing
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': `default-src 'self' beaker:`
      },
      data: intoStream(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
    <script type="module" src="beaker://drive-view/index.js"></script>
  </head>
</html>`)
    })
  }

  // frontend
  if (mime.acceptHeaderWantsHTML(request.headers.Accept) && frontend) {
    return serveFrontendHTML()
  }

  // handle not found
  if (!entry) {
    cleanup()

    // error page
    return respondError(404, 'File Not Found', {
      errorDescription: 'File Not Found',
      errorInfo: `Beaker could not find the file ${urlp.path}`,
      title: 'File Not Found'
    })
  }

  // TODO
  // Electron is being really aggressive about caching and not following the headers correctly
  // caching is disabled till we can figure out why
  // -prf
  // caching if-match
  // const ETag = 'block-' + entry.offset
  // if (request.headers['if-none-match'] === ETag) {
  //   return respondError(304, 'Not Modified')
  // }

  // handle range
  headers['Accept-Ranges'] = 'bytes'
  var range = request.headers.Range || request.headers.range
  if (range) range = parseRange(entry.size, range)
  if (range && range.type === 'bytes') {
    range = range[0] // only handle first range given
    statusCode = 206
    headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + entry.size
    headers['Content-Length'] = '' + (range.end - range.start + 1)
  } else {
    if (entry.size) {
      headers['Content-Length'] = '' + (entry.size)
    }
  }

  Object.assign(headers, {
    'Content-Security-Policy': cspHeader,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  })

  // markdown rendering
  if (!range && entry.path.endsWith('.md') && mime.acceptHeaderWantsHTML(request.headers.Accept)) {
    let content = await checkoutFS.pda.readFile(entry.path, 'utf8')
    let contentType = canExecuteHTML ? 'text/html' : 'text/plain'
    content = canExecuteHTML
      ? `<!doctype html>
<html>
  <head>
    <meta charset="utf8">
  </head>
  <body>
    ${md.render(content)}
  </body>
</html>`
      : content
    return respond({
      statusCode: 200,
      headers: Object.assign(headers, {
        'Content-Type': contentType
      }),
      data: intoStream(content)
    })
  }

  // fetch the entry and stream the response
  // HACK solution until electron issue resolved -prf
  headersSent = true
  Object.assign(headers, {
    'Content-Type': mime.identify(entry.path)
  })
  var data = await checkoutFS.pda.readFile(entry.path, 'binary')
  if (range) {
    data = data.slice(range.start, range.end + 1)
  }
  respond({
    statusCode,
    headers,
    data: intoStream(data)
  })
  /*fileReadStream = checkoutFS.pda.createReadStream(entry.path, range)
  var dataStream = fileReadStream
    .pipe(mime.identifyStream(entry.path, mimeType => {
      // cleanup the timeout now, as bytes have begun to stream
      cleanup()

      // disable html as needed
      if (!canExecuteHTML && mimeType.includes('html')) {
        mimeType = 'text/plain'
      }

      // send headers, now that we can identify the data
      headersSent = true
      Object.assign(headers, {
        'Content-Type': mimeType
      })
      // TODO
      // Electron is being really aggressive about caching and not following the headers correctly
      // caching is disabled till we can figure out why
      // -prf
      // if (ETag) {
      //   Object.assign(headers, {ETag})
      // } else {
      //   Object.assign(headers, {'Cache-Control': 'no-cache'})
      // }

      if (request.method === 'HEAD') {
        dataStream.destroy() // stop reading data
        respond({statusCode: 204, headers, data: intoStream('')})
      } else {
        respond({statusCode, headers, data: dataStream})
      }
    }))

  // handle empty files
  fileReadStream.once('end', () => {
    if (!headersSent) {
      cleanup()
      respond({
        statusCode: 200,
        headers: {
          'Content-Security-Policy': cspHeader,
          'Access-Control-Allow-Origin': '*'
        },
        data: intoStream('')
      })
    }
  })

  // handle read-stream errors
  fileReadStream.once('error', err => {
    logger.warn('Error reading file', {url: drive.url, path: entry.path, err})
    if (!headersSent) respondError(500, 'Failed to read file')
  })*/
}

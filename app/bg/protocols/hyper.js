import { parseDriveUrl } from '../../lib/urls'
import parseRange from 'range-parser'
import once from 'once'
import * as logLib from '../logger'
const logger = logLib.child({category: 'hyper', subcategory: 'hyper-scheme'})
// import intoStream from 'into-stream'
import markdown from '../../lib/markdown'
import * as drives from '../hyper/drives'
import * as filesystem from '../filesystem/index'
import * as capabilities from '../hyper/capabilities'
import datServeResolvePath from '@beaker/dat-serve-resolve-path'
import errorPage from '../lib/error-page'
import * as mime from '../lib/mime'
import * as auditLog from '../dbs/audit-log'

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
  const respondRedirect = (url) => {
    respond({
      statusCode: 200,
      headers: {'Content-Type': 'text/html', 'Allow-CSP-From': '*'},
      data: intoStream(`<!doctype html><meta http-equiv="refresh" content="0; url=${url}">`)
    })
  }
  const respondError = (code, status, errorPageInfo) => {
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
          'Access-Control-Allow-Origin': '*',
          'Allow-CSP-From': '*'
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
  var driveKey
  var driveVersion
  if (urlp.host.endsWith('.cap')) {
    let cap = capabilities.lookupCap(urlp.host)
    if (!cap) {
      return respondError(404, 'No record found for ' + urlp.host, {
        errorDescription: 'Invalid capability record',
        errorInfo: `No record found for hyper://${urlp.host}`
      })
    }
    driveKey = cap.target.key
    driveVersion = cap.target.version
  } else {
    try {
      driveKey = await drives.fromURLToKey(urlp.host, true)
      driveVersion = urlp.version
    } catch (err) {
      return respondError(404, 'No DNS record found for ' + urlp.host, {
        errorDescription: 'No DNS record found',
        errorInfo: `No DNS record found for hyper://${urlp.host}`
      })
    }
  }

  // protect the system drive
  if (filesystem.isRootUrl(`hyper://${driveKey}/`)) {
    // HACK
    // electron's CORS protection doesnt seem to be working
    // so we're going to handle all system-drive requests by redirecting
    // to the files explorer
    // -prf
    return respondRedirect(`beaker://explorer/${urlp.host}${urlp.version ? ('+' + urlp.version) : ''}${urlp.pathname || ''}`)
  }

  auditLog.record('-browser', 'serve', {url: urlp.origin, path: urlp.pathname}, undefined, async () => {
    try {
      // start searching the network
      drive = await drives.getOrLoadDrive(driveKey)
    } catch (err) {
      logger.warn(`Failed to open drive ${driveKey}`, {err})
      return respondError(500, 'Failed')
    }

    // parse path
    var filepath = decodeURIComponent(urlp.path)
    if (!filepath) filepath = '/'
    if (filepath.indexOf('?') !== -1) filepath = filepath.slice(0, filepath.indexOf('?')) // strip off any query params
    var hasTrailingSlash = filepath.endsWith('/')

    // checkout version if needed
    try {
      var {checkoutFS} = await drives.getDriveCheckout(drive, driveVersion)
    } catch (err) {
      logger.warn(`Failed to open drive checkout ${driveKey}`, {err})
      return respondError(500, 'Failed')
    }

    // read the manifest (it's needed in a couple places)
    var manifest
    try { manifest = await checkoutFS.pda.readManifest() } catch (e) { manifest = null }

    // check to see if we actually have data from the drive
    var version = await checkoutFS.session.drive.version()
    if (version === 0) {
      return respondError(404, 'Hyperdrive not found', {
        title: 'Hyperdrive Not Found',
        errorDescription: 'No peers hosting this drive were found',
        errorInfo: 'You may still be connecting to peers - try reloading the page.'
      })
    }

    // read manifest CSP
    if (manifest && manifest.csp && typeof manifest.csp === 'string') {
      cspHeader = manifest.csp
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
          'Allow-CSP-From': '*',
          'Content-Security-Policy': cspHeader
        },
        data: intoStream(await checkoutFS.pda.readFile('/.ui/ui.html')) // TODO use stream
      })
    }

    // lookup entry
    var statusCode = 200
    var headers = {}
    var entry = await datServeResolvePath(checkoutFS.pda, manifest, urlp, request.headers.Accept)

    var canExecuteHTML = true
    if (entry && !frontend) {
      // dont execute HTML if in a mount and no frontend is running
      let pathParts = entry.path.split('/').filter(Boolean)
      pathParts.pop() // skip target, just need to check parent dirs
      while (pathParts.length) {
        let path = '/' + pathParts.join('/')
        let stat = await checkoutFS.pda.stat(path).catch(e => undefined)
        if (stat && stat.mount) {
          canExecuteHTML = false
          break
        }
        pathParts.pop()
      }
    }

    // handle folder
    if (entry && entry.isDirectory()) {

      // make sure there's a trailing slash
      if (!hasTrailingSlash) {
        return respondRedirect(`hyper://${urlp.host}${urlp.version ? ('+' + urlp.version) : ''}${urlp.pathname || ''}/${urlp.search || ''}`)
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
          'Allow-CSP-From': '*',
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

      // error page
      return respondError(404, 'File Not Found', {
        errorDescription: 'File Not Found',
        errorInfo: `Beaker could not find the file ${urlp.path}`,
        title: 'File Not Found'
      })
    }

    // handle .goto redirects
    if (entry.path.endsWith('.goto') && entry.metadata.href) {
      try {
        let u = new URL(entry.metadata.href) // make sure it's a valid url
        return respondRedirect(entry.metadata.href)
      } catch (e) {
        // pass through
      }
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
      'Allow-CSP-From': '*',
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
    var mimeType = mime.identify(entry.path)
    if (!canExecuteHTML && mimeType.includes('text/html')) {
      mimeType = 'text/plain'
    }
    Object.assign(headers, {'Content-Type': mimeType})
    var data = await checkoutFS.pda.readFile(entry.path, 'binary')
    if (range) {
      data = data.slice(range.start, range.end + 1)
    }
    respond({
      statusCode,
      headers,
      data: intoStream(data)
    })
  })
  /*fileReadStream = checkoutFS.pda.createReadStream(entry.path, range)
  var dataStream = fileReadStream
    .pipe(mime.identifyStream(entry.path, mimeType => {

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

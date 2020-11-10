import { parseDriveUrl } from '../../lib/urls'
import { toNiceUrl } from '../../lib/strings'
import { Readable } from 'stream'
import parseRange from 'range-parser'
import once from 'once'
import * as logLib from '../logger'
const logger = logLib.child({category: 'hyper', subcategory: 'hyper-scheme'})
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

class WhackAMoleStream {
  constructor (stream) {
    this.onreadable = noop
    this.ended = false
    this.stream = stream
    this.needsDeferredReadable = false
    this.readableOnce = false

    stream.on('end', () => {
      this.ended = true
    })

    stream.on('readable', () => {
      this.readableOnce = true

      if (this.needsDeferredReadable) {
        setImmediate(this.onreadable)
        this.needsDeferredReadable = false
        return
      }

      this.onreadable()
    })
  }

  read (...args) {
    const buf = this.stream.read(...args)
    this.needsDeferredReadable = buf === null
    return buf
  }

  on (name, fn) {
    if (name === 'readable') {
      this.onreadable = fn
      if (this.readableOnce) fn()
      return this.stream.on('readable', noop) // readable has sideeffects
    }

    return this.stream.on(name, fn)
  }

  destroy () {
    this.stream.on('error', noop)
    this.stream.destroy()
  }

  removeListener (name, fn) {
    this.stream.removeListener(name, fn)

    if (name === 'readable') {
      this.onreadable = noop
      this.stream.removeListener('readable', noop)
    }

    if (name === 'end' && !this.ended) {
      this.destroy()
    }
  }
}

function noop () {}

// exported api
// =

export function register (protocol) {
  protocol.registerStreamProtocol('hyper', protocolHandler)
}

export const protocolHandler = async function (request, respond) {
  var drive
  var cspHeader = undefined
  var corsHeader = '*'
  var customFrontend = false
  var wantsHTML = mime.acceptHeaderWantsHTML(request.headers.Accept)
  const logUrl = toNiceUrl(request.url)

  respond = once(respond)
  const respondBuiltinFrontend = async () => {
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': corsHeader,
        'Allow-CSP-From': '*',
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': `default-src beaker:; img-src * data: asset: blob:; media-src * data: asset: blob:; style-src beaker: 'unsafe-inline';`,
        'Beaker-Trusted-Interface': '1' // see wc-trust.js
      },
      data: intoStream(`<!DOCTYPE html>
<html>
  <head>
    <title>Loading...</title>
    <link rel="stylesheet" href="beaker://explorer/index.css">
  </head>
  <body>
    <explorer-app></explorer-app>
    <script type="module" src="beaker://explorer/js/main.js"></script>
  </body>
</html>`)
    })
  }
  const respondCustomFrontend = async (checkoutFS) => {
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': corsHeader,
        'Allow-CSP-From': '*',
        'Content-Security-Policy': cspHeader
      },
      data: intoStream(await checkoutFS.pda.readFile('/.ui/ui.html')) // TODO use stream
    })
  }
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
          'Access-Control-Allow-Origin': corsHeader,
          'Allow-CSP-From': '*'
        },
        data: intoStream(errorPage(errorPageInfo || (code + ' ' + status)))
      })
    } else {
      respond({statusCode: code})
    }
  }

  // validate request
  logger.silly(`Starting ${logUrl}`, {url: request.url})
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
    corsHeader = undefined
  }

  auditLog.record('-browser', 'serve', {url: urlp.origin, path: urlp.pathname}, undefined, async () => {
    try {
      // start searching the network
      logger.silly(`Loading drive for ${logUrl}`, {url: request.url})
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
      logger.silly(`Drive not found ${logUrl}`, {url: request.url})
      return respondError(404, 'Site not found', {
        title: 'Site Not Found',
        errorDescription: 'No peers hosting this site were found',
        errorInfo: 'You may still be connecting to peers - try reloading the page.'
      })
    }

    // read manifest CSP
    if (manifest && manifest.csp && typeof manifest.csp === 'string') {
      cspHeader = manifest.csp
    }

    // check for the presence of a frontend
    if (await checkoutFS.pda.stat('/.ui/ui.html').catch(e => false)) {
      customFrontend = true
    }

    // lookup entry
    var statusCode = 200
    var headers = {}
    var entry = await datServeResolvePath(checkoutFS.pda, manifest, urlp, request.headers.Accept)

    var canExecuteHTML = true
    if (entry && !customFrontend) {
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
      if (!hasTrailingSlash) {
        // make sure there's a trailing slash
        logger.silly(`Redirecting to trailing slash ${logUrl}`, {url: request.url})
        return respondRedirect(`hyper://${urlp.host}${urlp.version ? ('+' + urlp.version) : ''}${urlp.pathname || ''}/${urlp.search || ''}`)
      }
      if (customFrontend) {
        logger.silly(`Serving custom frontend ${logUrl}`, {url: request.url})
        return respondCustomFrontend(checkoutFS)
      }
      logger.silly(`Serving builtin frontend ${logUrl}`, {url: request.url})
      return respondBuiltinFrontend()
    }

    // custom frontend
    if (customFrontend && wantsHTML) {
      logger.silly(`Serving custom frontend ${logUrl}`, {url: request.url})
      return respondCustomFrontend(checkoutFS)
    }

    // 404
    if (!entry) {
      logger.silly('Not found', {url: request.url})
      if (wantsHTML) { 
        logger.silly(`Serving builtin frontend ${logUrl}`, {url: request.url})
        return respondBuiltinFrontend()
      }
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
        logger.silly(`Redirecting for .goto ${logUrl} to ${entry.metadata.href}`, {url: request.url, href: entry.metadata.href})
        return respondRedirect(entry.metadata.href)
      } catch (e) {
        // pass through
      }
    }

    // detect mimetype
    var mimeType = entry.metadata.mimetype || entry.metadata.mimeType
    if (!mimeType) {
      mimeType = mime.identify(entry.path)
    }
    if (!canExecuteHTML && mimeType.includes('text/html')) {
      mimeType = 'text/plain'
    }

    if (wantsHTML && !mimeType.includes('text/html')) {
      // builtin frontend when not viewing an html file
      logger.silly(`Serving builtin frontend ${logUrl}`, {url: request.url})
      return respondBuiltinFrontend()
    }

    // handle range
    headers['Accept-Ranges'] = 'bytes'
    var length
    var range = request.headers.Range || request.headers.range
    if (range) range = parseRange(entry.size, range)
    if (range && range.type === 'bytes') {
      range = range[0] // only handle first range given
      statusCode = 206
      length = (range.end - range.start + 1)
      headers['Content-Length'] = '' + length
      headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + entry.size
    } else {
      if (entry.size) {
        length = entry.size
        headers['Content-Length'] = '' + length
      }
    }

    Object.assign(headers, {
      'Content-Security-Policy': cspHeader,
      'Access-Control-Allow-Origin': corsHeader,
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
    <style>
      body {
        font-family: sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 0 10px;
        line-height: 1.4;
      }
      body * {
        max-width: 100%;
      }
    </style>
  </head>
  <body>
    ${md.render(content)}
  </body>
</html>`
        : content
      logger.silly(`Serving markdown ${logUrl}`, {url: request.url})
      return respond({
        statusCode: 200,
        headers: Object.assign(headers, {'Content-Type': contentType}),
        data: intoStream(content)
      })
    }

    var mimeType = entry.metadata.mimeType;
    if (!mimeType) {
      let chunk;
      for await (const part of checkoutFS.session.drive.createReadStream(entry.path, { start: 0, length: 512 })) {
        chunk = chunk ? Buffer.concat([chunk, part]) : part;
      }
      mimeType = mime.identify(entry.path, chunk)
    }
    if (!canExecuteHTML && mimeType.includes('text/html')) {
      mimeType = 'text/plain'
    }
    headers['Content-Type'] = mimeType
    logger.silly(`Serving file ${logUrl}`, {url: request.url})
    if (request.method === 'HEAD') {
      respond({statusCode: 204, headers, data: intoStream('')})
    } else {
      respond({
        statusCode,
        headers,
        data: new WhackAMoleStream(checkoutFS.session.drive.createReadStream(entry.path, range))
      })
    }
  })
}

function intoStream (text) {
  return new Readable({
    read () {
      this.push(text)
      this.push(null)
    }
  })
}

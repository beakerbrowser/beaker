import {protocol} from 'electron'
import * as beakerCore from '@beaker/core'
import errorPage from '@beaker/core/lib/error-page'
import * as mime from '@beaker/core/lib/mime'
const {archivesDebugPage, datDnsCachePage, datDnsCacheJS} = beakerCore.dat.debug
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import intoStream from 'into-stream'
import ICO from 'icojs'

const START_APP_PATH = path.dirname(require.resolve('@beaker/start-app')).replace('app.asar', 'app.asar.unpacked')
const LIBRARY_APP_PATH = path.dirname(require.resolve('@beaker/library-app')).replace('app.asar', 'app.asar.unpacked')
const COMPARE_APP_PATH = path.dirname(require.resolve('@beaker/compare-app')).replace('app.asar', 'app.asar.unpacked')
const SEARCH_APP_PATH = path.dirname(require.resolve('@beaker/search-app')).replace('app.asar', 'app.asar.unpacked')
const SIDEBAR_APP_PATH = path.dirname(require.resolve('@beaker/sidebar-app')).replace('app.asar', 'app.asar.unpacked')
const SITE_INFO_APP_PATH = path.dirname(require.resolve('@beaker/site-info-app')).replace('app.asar', 'app.asar.unpacked')
const VIEWER_APPS_PATH = path.dirname(require.resolve('@beaker/viewer-apps')).replace('app.asar', 'app.asar.unpacked')

// constants
// =

// content security policies
const BEAKER_CSP = `
  default-src 'self' beaker:;
  img-src beaker-favicon: beaker: asset: data: dat: http: https;
  script-src 'self' beaker: 'unsafe-eval';
  media-src 'self' beaker: dat:;
  style-src 'self' 'unsafe-inline' beaker:;
  child-src 'self';
`.replace(/\n/g, '')

// exported api
// =

export function setup () {
  // setup the protocol handler
  protocol.registerStreamProtocol('beaker', beakerProtocol, err => {
    if (err) throw new Error('Failed to create protocol: beaker. ' + err)
  })
}

// internal methods
// =

async function beakerProtocol (request, respond) {
  var cb = once((statusCode, status, contentType, path) => {
    const headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': (contentType || 'text/html; charset=utf-8'),
      'Content-Security-Policy': BEAKER_CSP,
      'Access-Control-Allow-Origin': '*'
    }
    if (typeof path === 'string') {
      respond({statusCode, headers, data: fs.createReadStream(path)})
    } else if (typeof path === 'function') {
      respond({statusCode, headers, data: intoStream(path())})
    } else {
      respond({statusCode, headers, data: intoStream(errorPage(statusCode + ' ' + status))})
    }
  })
  async function serveICO (path, size = 16) {
    // read the file
    const data = await jetpack.readAsync(path, 'buffer')

    // parse the ICO to get the 16x16
    const images = await ICO.parse(data, 'image/png')
    let image = images[0]
    for (let i = 1; i < images.length; i++) {
      if (Math.abs(images[i].width - size) < Math.abs(image.width - size)) {
        image = images[i]
      }
    }

    // serve
    cb(200, 'OK', 'image/png', () => Buffer.from(image.buffer))
  }

  var requestUrl = request.url
  var queryParams
  {
    // strip off the hash
    let i = requestUrl.indexOf('#')
    if (i !== -1) requestUrl = requestUrl.slice(0, i)
  }
  {
    // get the query params
    queryParams = url.parse(requestUrl, true).query

    // strip off the query
    let i = requestUrl.indexOf('?')
    if (i !== -1) requestUrl = requestUrl.slice(0, i)
  }

  // browser ui
  if (requestUrl === 'beaker://shell-window/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'shell-window.html'))
  }
  if (requestUrl === 'beaker://shell-window/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'shell-window.build.js'))
  }
  if (requestUrl === 'beaker://shell-window/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/shell-window.css'))
  }
  if (requestUrl === 'beaker://location-bar/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'location-bar.html'))
  }
  if (requestUrl === 'beaker://shell-menus/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'shell-menus.html'))
  }
  if (requestUrl === 'beaker://prompts/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'prompts.html'))
  }
  if (requestUrl === 'beaker://perm-prompt/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'perm-prompt.html'))
  }
  if (requestUrl === 'beaker://modals/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'modals.html'))
  }
  if (requestUrl === 'beaker://assets/syntax-highlight.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'assets/js/syntax-highlight.js'))
  }
  if (requestUrl === 'beaker://assets/syntax-highlight.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/css/syntax-highlight.css'))
  }
  if (requestUrl === 'beaker://assets/icons.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/icons.css'))
  }
  if (requestUrl === 'beaker://assets/font-awesome.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/fonts/font-awesome/css/all.min.css'))
  }
  if (requestUrl === 'beaker://assets/fa-regular-400.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.woff2'))
  }
  if (requestUrl === 'beaker://assets/fa-regular-400.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.woff'))
  }
  if (requestUrl === 'beaker://assets/fa-regular-400.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.svg'))
  }
  if (requestUrl === 'beaker://assets/fa-solid-900.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.woff2'))
  }
  if (requestUrl === 'beaker://assets/fa-solid-900.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.woff'))
  }
  if (requestUrl === 'beaker://assets/fa-solid-900.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.svg'))
  }
  if (requestUrl === 'beaker://assets/fa-brands-400.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.woff2'))
  }
  if (requestUrl === 'beaker://assets/fa-brands-400.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.woff'))
  }
  if (requestUrl === 'beaker://assets/fa-brands-400.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.svg'))
  }
  if (requestUrl === 'beaker://assets/font-photon-entypo') {
    return cb(200, 'OK', 'application/font-woff', path.join(__dirname, 'assets/fonts/photon-entypo.woff'))
  }
  if (requestUrl === 'beaker://assets/font-source-sans-pro') {
    return cb(200, 'OK', 'application/font-woff2', path.join(__dirname, 'assets/fonts/source-sans-pro.woff2'))
  }
  if (requestUrl === 'beaker://assets/font-source-sans-pro-le') {
    return cb(200, 'OK', 'application/font-woff2', path.join(__dirname, 'assets/fonts/source-sans-pro-le.woff2'))
  }
  if (requestUrl.startsWith('beaker://assets/logo2')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/logo2.png'))
  }
  if (requestUrl.startsWith('beaker://assets/logo')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/logo.png'))
  }
  if (requestUrl.startsWith('beaker://assets/default-user-thumb')) {
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/default-user-thumb.jpg'))
  }
  if (requestUrl.startsWith('beaker://assets/search-icon-large')) {
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/search-icon-large.png'))
  }
  if (requestUrl.startsWith('beaker://assets/favicons/')) {
    return serveICO(path.join(__dirname, 'assets/favicons', requestUrl.slice('beaker://assets/favicons/'.length)))
  }
  if (requestUrl.startsWith('beaker://assets/search-engines/')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/search-engines', requestUrl.slice('beaker://assets/search-engines/'.length)))
  }
  if (requestUrl.startsWith('beaker://assets/img/templates/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/templates/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/templates/${imgPath}`))
  }

  // builtin pages
  if (requestUrl === 'beaker://assets/builtin-pages.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages.css'))
  }
  if (requestUrl.startsWith('beaker://assets/img/onboarding/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/onboarding/'.length)
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, `assets/img/onboarding/${imgPath}`))
  }
  if (requestUrl === 'beaker://start' || requestUrl.startsWith('beaker://start/')) {
    return serveAppAsset(requestUrl, START_APP_PATH, cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://sidebar' || requestUrl.startsWith('beaker://sidebar/')) {
    return serveAppAsset(requestUrl, SIDEBAR_APP_PATH, cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://library' || requestUrl.startsWith('beaker://library/')) {
    return serveAppAsset(requestUrl, LIBRARY_APP_PATH, cb)
  }
  if (requestUrl === 'beaker://compare' || requestUrl.startsWith('beaker://compare/')) {
    return serveAppAsset(requestUrl, COMPARE_APP_PATH, cb)
  }
  if (requestUrl === 'beaker://search' || requestUrl.startsWith('beaker://search/')) {
    return serveAppAsset(requestUrl, SEARCH_APP_PATH, cb)
  }
  if (requestUrl === 'beaker://site-info' || requestUrl.startsWith('beaker://site-info/')) {
    return serveAppAsset(requestUrl, SITE_INFO_APP_PATH, cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://viewers' || requestUrl.startsWith('beaker://viewers/')) {
    return serveAppAsset(requestUrl, VIEWER_APPS_PATH, cb)
  }
  if (requestUrl === 'beaker://history/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/history.html'))
  }
  if (requestUrl === 'beaker://history/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/history.build.js'))
  }
  if (requestUrl === 'beaker://downloads/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/downloads.html'))
  }
  if (requestUrl === 'beaker://downloads/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/downloads.build.js'))
  }
  if (requestUrl === 'beaker://swarm-debugger/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/swarm-debugger.css'))
  }
  if (requestUrl === 'beaker://swarm-debugger/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/swarm-debugger.build.js'))
  }
  if (requestUrl === 'beaker://swarm-debugger/' || requestUrl.startsWith('beaker://swarm-debugger/')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/swarm-debugger.html'))
  }
  if (requestUrl === 'beaker://settings/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/settings.html'))
  }
  if (requestUrl === 'beaker://settings/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/settings.build.js'))
  }
  if (requestUrl === 'beaker://watchlist/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/watchlist.css'))
  }
  if (requestUrl === 'beaker://watchlist/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/watchlist.build.js'))
  }
  if (requestUrl === 'beaker://watchlist/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/watchlist.html'))
  }
  if (requestUrl === 'beaker://editor/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/editor.css'))
  }
  if (requestUrl === 'beaker://editor/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/editor.build.js'))
  }
  if (requestUrl === 'beaker://assets/monaco.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'assets/js/editor/monaco.js'))
  }
  if (requestUrl.startsWith('beaker://assets/vs/') && requestUrl.endsWith('.js')) {
    let filePath = requestUrl.slice('beaker://assets/vs/'.length)
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, `assets/js/editor/vs/${filePath}`))
  }
  if (requestUrl.startsWith('beaker://assets/vs/') && requestUrl.endsWith('.css')) {
    let filePath = requestUrl.slice('beaker://assets/vs/'.length)
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, `assets/js/editor/vs/${filePath}`))
  }
  if (requestUrl.startsWith('beaker://editor/')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/editor.html'))
  }

  // debugging
  if (requestUrl === 'beaker://internal-archives/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', archivesDebugPage)
  }
  if (requestUrl === 'beaker://dat-dns-cache/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', datDnsCachePage)
  }
  if (requestUrl === 'beaker://dat-dns-cache/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', datDnsCacheJS)
  }
  if (requestUrl.startsWith('beaker://debug-log/')) {
    const PAGE_SIZE = 1e6
    var start = queryParams.start ? (+queryParams.start) : 0
    let content = await beakerCore.getLogFileContent(start, start + PAGE_SIZE)
    var pagination = `<h2>Showing bytes ${start} - ${start + PAGE_SIZE}. <a href="beaker://debug-log/?start=${start + PAGE_SIZE}">Next page</a></h2>`
    return respond({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': BEAKER_CSP,
        'Access-Control-Allow-Origin': '*'
      },
      data: intoStream(`
        ${pagination}
        <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        ${pagination}
      `)
    })
  }

  return cb(404, 'Not Found')
}

// helper to serve requests to app packages
async function serveAppAsset (requestUrl, dirPath, cb, {fallbackToIndexHTML} = {fallbackToIndexHTML: false}) {
  // resolve the file path
  const urlp = new URL(requestUrl)
  var pathname = urlp.pathname
  if (pathname === '' || pathname === '/') {
    pathname = '/index.html'
  }
  var filepath = path.join(dirPath, pathname)

  // make sure the file exists
  try {
    await fs.promises.stat(filepath)
  } catch (e) {
    if (fallbackToIndexHTML) {
      filepath = path.join(dirPath, '/index.html')
    } else {
      return cb(404, 'Not Found')
    }
  }

  // identify the mime type
  var contentType = mime.identify(filepath)

  // serve
  cb(200, 'OK', contentType, filepath)
}
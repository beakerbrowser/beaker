import errorPage from '../lib/error-page'
import * as mime from '../lib/mime'
import { drivesDebugPage, datDnsCachePage, datDnsCacheJS } from '../hyper/debugging'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import intoStream from 'into-stream'
import ICO from 'icojs'

// constants
// =

// content security policies
const BEAKER_CSP = `
  default-src 'self' beaker:;
  img-src beaker: asset: data: hyper: http: https;
  script-src 'self' beaker: 'unsafe-eval';
  media-src 'self' beaker: hyper:;
  style-src 'self' 'unsafe-inline' beaker:;
  child-src 'self';
`.replace(/\n/g, '')
const BEAKER_DESKTOP_CSP = `
  default-src 'self' beaker:;
  img-src beaker: asset: data: hyper: http: https;
  script-src 'self' beaker: 'unsafe-eval';
  media-src 'self' beaker: hyper:;
  style-src 'self' 'unsafe-inline' beaker:;
  child-src 'self' hyper:;
`.replace(/\n/g, '')
const SIDEBAR_CSP = `
default-src 'self' beaker:;
img-src beaker: asset: data: hyper: http: https;
script-src 'self' beaker: hyper: blob: 'unsafe-eval';
media-src 'self' beaker: hyper:;
style-src 'self' 'unsafe-inline' beaker:;
child-src 'self' beaker:;
`.replace(/\n/g, '')

// exported api
// =

export function register (protocol) {
  // setup the protocol handler
  protocol.registerStreamProtocol('beaker', beakerProtocol)
}

// internal methods
// =

async function beakerProtocol (request, respond) {
  var cb = once((statusCode, status, contentType, path, CSP) => {
    const headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': (contentType || 'text/html; charset=utf-8'),
      'Content-Security-Policy': CSP || BEAKER_CSP,
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

  // redirects from old pages
  if (requestUrl.startsWith('beaker://start/')) {
    return cb(200, 'OK', 'text/html', () => `<!doctype html><meta http-equiv="refresh" content="0; url=beaker://desktop/">`)
  }

  // browser ui
  if (requestUrl === 'beaker://shell-window/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'shell-window', 'index.html'))
  }
  if (requestUrl === 'beaker://shell-window/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'fg', 'shell-window', 'index.build.js'))
  }
  if (requestUrl === 'beaker://location-bar/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'location-bar', 'index.html'))
  }
  if (requestUrl === 'beaker://shell-menus/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'shell-menus', 'index.html'))
  }
  if (requestUrl === 'beaker://prompts/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'prompts', 'index.html'))
  }
  if (requestUrl === 'beaker://perm-prompt/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'perm-prompt', 'index.html'))
  }
  if (requestUrl === 'beaker://modals/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'modals', 'index.html'))
  }
  if (requestUrl === 'beaker://assets/syntax-highlight.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'assets/js/syntax-highlight.js'))
  }
  if (requestUrl === 'beaker://assets/syntax-highlight.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/css/syntax-highlight.css'))
  }
  if (requestUrl === 'beaker://assets/icons.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/stylesheets/icons.css'))
  }
  if (requestUrl === 'beaker://assets/font-awesome.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/css/fa-all.min.css'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-regular-400.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.woff2'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-regular-400.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.woff'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-regular-400.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.svg'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-solid-900.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.woff2'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-solid-900.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.woff'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-solid-900.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.svg'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-brands-400.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.woff2'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-brands-400.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.woff'))
  }
  if (requestUrl === 'beaker://assets/webfonts/fa-brands-400.svg') {
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
  if (requestUrl === 'beaker://assets/logo-black.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/logo-black.svg'))
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
  if (requestUrl.startsWith('beaker://setup/default-user-thumb')) {
    // rehost under beaker://setup because there's a CSP bug stopping beaker://setup from accessing beaker://assets
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/default-user-thumb.jpg'))
  }
  if (requestUrl.startsWith('beaker://assets/default-frontend-thumb')) {
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/default-frontend-thumb.jpg'))
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
  if (requestUrl.startsWith('beaker://assets/img/frontends/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/frontends/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/frontends/${imgPath}`))
  }
  if (requestUrl.startsWith('beaker://assets/img/drive-types/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/drive-types/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/drive-types/${imgPath}`))
  }

  // userland
  if (requestUrl === 'beaker://app-stdlib' || requestUrl.startsWith('beaker://app-stdlib/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'app-stdlib'), cb)
  }
  if (requestUrl === 'beaker://diff' || requestUrl.startsWith('beaker://diff/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'diff'), cb)
  }
  if (requestUrl === 'beaker://library' || requestUrl.startsWith('beaker://library/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'library'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://drive-view' || requestUrl.startsWith('beaker://drive-view/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'drive-view'), cb)
  }
  if (requestUrl === 'beaker://cmd-pkg' || requestUrl.startsWith('beaker://cmd-pkg/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'cmd-pkg'), cb)
  }
  if (requestUrl === 'beaker://std-cmds' || requestUrl.startsWith('beaker://std-cmds/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'std-cmds'), cb)
  }
  if (requestUrl === 'beaker://site-info' || requestUrl.startsWith('beaker://site-info/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'site-info'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://setup' || requestUrl.startsWith('beaker://setup/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'setup'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://init' || requestUrl.startsWith('beaker://init/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'init'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://editor' || requestUrl.startsWith('beaker://editor/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'editor'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://explorer' || requestUrl.startsWith('beaker://explorer/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'explorer'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'beaker://webterm' || requestUrl.startsWith('beaker://webterm/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'webterm'), cb, {
      fallbackToIndexHTML: true,
      CSP: SIDEBAR_CSP
    })
  }
  if (requestUrl === 'beaker://desktop' || requestUrl.startsWith('beaker://desktop/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'desktop'), cb, {
      CSP: BEAKER_DESKTOP_CSP,
      fallbackToIndexHTML: true,
    })
  }
  if (requestUrl === 'beaker://history' || requestUrl.startsWith('beaker://history/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'history'), cb)
  }
  if (requestUrl === 'beaker://settings' || requestUrl.startsWith('beaker://settings/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'settings'), cb)
  }

  // builtin pages
  if (requestUrl === 'beaker://assets/builtin-pages.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/stylesheets/builtin-pages.css'))
  }
  if (requestUrl.startsWith('beaker://assets/img/onboarding/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/onboarding/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/onboarding/${imgPath}`))
  }
  if (requestUrl === 'beaker://swarm-debugger/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/stylesheets/builtin-pages/swarm-debugger.css'))
  }
  if (requestUrl === 'beaker://swarm-debugger/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/build/swarm-debugger.build.js'))
  }
  if (requestUrl === 'beaker://swarm-debugger/' || requestUrl.startsWith('beaker://swarm-debugger/')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/swarm-debugger.html'))
  }
  if (requestUrl === 'beaker://watchlist/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/stylesheets/builtin-pages/watchlist.css'))
  }
  if (requestUrl === 'beaker://watchlist/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/build/watchlist.build.js'))
  }
  if (requestUrl === 'beaker://watchlist/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/watchlist.html'))
  }
  if (requestUrl === 'beaker://editor/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/stylesheets/builtin-pages/editor.css'))
  }
  if (requestUrl === 'beaker://editor/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/build/editor.build.js'))
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
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg/builtin-pages/editor.html'))
  }

  // debugging
  if (requestUrl === 'beaker://active-drives/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', drivesDebugPage)
  }
  if (requestUrl === 'beaker://dat-dns-cache/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', datDnsCachePage)
  }
  if (requestUrl === 'beaker://dat-dns-cache/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', datDnsCacheJS)
  }
  // TODO replace?
  // if (requestUrl.startsWith('beaker://debug-log/')) {
  //   const PAGE_SIZE = 1e6
  //   var start = queryParams.start ? (+queryParams.start) : 0
  //   let content = await beakerCore.getLogFileContent(start, start + PAGE_SIZE)
  //   var pagination = `<h2>Showing bytes ${start} - ${start + PAGE_SIZE}. <a href="beaker://debug-log/?start=${start + PAGE_SIZE}">Next page</a></h2>`
  //   return respond({
  //     statusCode: 200,
  //     headers: {
  //       'Content-Type': 'text/html; charset=utf-8',
  //       'Content-Security-Policy': BEAKER_CSP,
  //       'Access-Control-Allow-Origin': '*'
  //     },
  //     data: intoStream(`
  //       ${pagination}
  //       <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  //       ${pagination}
  //     `)
  //   })
  // }

  return cb(404, 'Not Found')
}

// helper to serve requests to app packages
async function serveAppAsset (requestUrl, dirPath, cb, {CSP, fallbackToIndexHTML} = {CSP: undefined, fallbackToIndexHTML: false}) {
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
  cb(200, 'OK', contentType, filepath, CSP)
}
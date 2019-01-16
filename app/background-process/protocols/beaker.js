import {app, protocol} from 'electron'
import * as beakerCore from '@beaker/core'
import errorPage from '@beaker/core/lib/error-page'
const {templates} = beakerCore.dbs
const {archivesDebugPage, datDnsCachePage, datDnsCacheJS} = beakerCore.dat.debug
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
  img-src beaker-favicon: beaker: data: dat: http: https;
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

  // template screenshots
  if (requestUrl.startsWith('beaker://templates/screenshot/')) {
    let templateUrl = requestUrl.slice('beaker://templates/screenshot/'.length)
    templates.getScreenshot(0, templateUrl)
      .then(({screenshot}) => {
        screenshot = screenshot.split(',')[1]
        cb(200, 'OK', 'image/png', () => Buffer.from(screenshot, 'base64'))
      })
      .catch(err => {
        console.error('Failed to load template screenshot', templateUrl, err)
        return cb(404, 'Not Found')
      })
    return
  }

  // builtin pages
  if (requestUrl === 'beaker://assets/builtin-pages.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages.css'))
  }
  if (requestUrl.startsWith('beaker://assets/img/onboarding/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/onboarding/'.length)
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, `assets/img/onboarding/${imgPath}`))
  }
  if (requestUrl.startsWith('beaker://assets/img/templates/')) {
    let imgPath = requestUrl.slice('beaker://assets/img/templates/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/templates/${imgPath}`))
  }
  if (requestUrl.startsWith('beaker://assets/ace/') && requestUrl.endsWith('.js')) {
    let filePath = requestUrl.slice('beaker://assets/ace/'.length)
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, `assets/js/ace-1.3.3/${filePath}`))
  }
  if (requestUrl === 'beaker://assets/icon/photos.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/icon/photos.png'))
  }
  if (requestUrl === 'beaker://assets/icon/avatar.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/icon/avatar.svg'))
  }
  if (requestUrl === 'beaker://assets/icon/folder-color.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/icon/folder-color.png'))
  }
  if (requestUrl === 'beaker://assets/icon/grid.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/icon/grid.svg'))
  }
  if (requestUrl === 'beaker://assets/icon/star.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/icon/star.svg'))
  }
  if (requestUrl === 'beaker://assets/icon/filesystem.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/icon/filesystem.svg'))
  }
  if (requestUrl === 'beaker://assets/icon/history.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/icon/history.svg'))
  }
  if (requestUrl === 'beaker://assets/icon/gear.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/icon/gear.svg'))
  }
  if (requestUrl === 'beaker://start/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/start.html'))
  }
  if (requestUrl.startsWith('beaker://start/background-image-default')) {
    let imgPath = requestUrl.slice('beaker://start/background-image-default'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/start${imgPath}`))
  }
  if (requestUrl === 'beaker://start/background-image') {
    return cb(200, 'OK', 'image/png', path.join(app.getPath('userData'), 'start-background-image'))
  }
  if (requestUrl === 'beaker://start/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/start.css'))
  }
  if (requestUrl === 'beaker://start/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/start.build.js'))
  }
  if (requestUrl === 'beaker://bookmarks/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/bookmarks.html'))
  }
  if (requestUrl === 'beaker://bookmarks/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/bookmarks.build.js'))
  }
  if (requestUrl === 'beaker://timeline/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/timeline.html'))
  }
  if (requestUrl === 'beaker://timeline/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/timeline.build.js'))
  }
  if (requestUrl === 'beaker://timeline/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/timeline.css'))
  }
  if (requestUrl === 'beaker://search/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/search.html'))
  }
  if (requestUrl === 'beaker://search/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/search.build.js'))
  }
  if (requestUrl === 'beaker://search/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/search.css'))
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
  // if (requestUrl === 'beaker://filesystem/main.css') {
  //   return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/filesystem.css'))
  // }
  // if (requestUrl === 'beaker://filesystem/main.js') {
  //   return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/filesystem.build.js'))
  // }
  // if (requestUrl === 'beaker://filesystem/' || requestUrl.startsWith('beaker://filesystem/')) {
  //   return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/filesystem.html'))
  // }
  if (requestUrl === 'beaker://library/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/library.css'))
  }
  if (requestUrl === 'beaker://library/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/library.build.js'))
  }
  if (requestUrl === 'beaker://library/view.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/library-view.build.js'))
  }
  if (requestUrl === 'beaker://library/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/library.html'))
  }
  if (requestUrl.startsWith('beaker://library/')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/library-view.html'))
  }
  // if (requestUrl === 'beaker://install-modal/main.css') {
  //   return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/install-modal.css'))
  // }
  // if (requestUrl === 'beaker://install-modal/main.js') {
  //   return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/install-modal.build.js'))
  // }
  // if (requestUrl === 'beaker://install-modal/' || requestUrl.startsWith('beaker://install-modal/')) {
  //   return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/install-modal.html'))
  // }
  if (requestUrl === 'beaker://view-source/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/view-source.css'))
  }
  if (requestUrl === 'beaker://view-source/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/view-source.build.js'))
  }
  if (requestUrl === 'beaker://view-source/' || requestUrl.startsWith('beaker://view-source/')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/view-source.html'))
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

  // modals
  if (requestUrl === 'beaker://basic-auth-modal/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/basic-auth-modal.html'))
  }
  if (requestUrl === 'beaker://basic-auth-modal/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/basic-auth-modal.css'))
  }
  if (requestUrl === 'beaker://basic-auth-modal/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/basic-auth-modal.build.js'))
  }
  if (requestUrl === 'beaker://prompt-modal/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/prompt-modal.html'))
  }
  if (requestUrl === 'beaker://prompt-modal/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/prompt-modal.css'))
  }
  if (requestUrl === 'beaker://prompt-modal/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/prompt-modal.build.js'))
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

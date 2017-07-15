import {app, protocol} from 'electron'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import errorPage from '../../lib/error-page'
import {archivesDebugPage, datDnsCachePage, datDnsCacheJS} from '../networks/dat/debugging'

// constants
// =

// content security policies
const BEAKER_CSP = `
  default-src 'self' beaker:;
  img-src beaker-favicon: beaker: data: dat: http: https;
  script-src 'self' beaker:;
  media-src 'self' beaker: dat:;
  style-src 'self' 'unsafe-inline' beaker:;
`.replace(/\n/g, '')

// globals
// =

var serverPort // port assigned to us
var requestNonce // used to limit access to the server from the outside

// exported api
// =

export function setup () {
  // generate a secret nonce
  requestNonce = '' + crypto.randomBytes(4).readUInt32LE(0)

  // setup the protocol handler
  protocol.registerHttpProtocol('beaker',
    (request, cb) => {
      // send requests to the protocol server
      cb({
        method: request.method,
        url: `http://localhost:${serverPort}/?url=${encodeURIComponent(request.url)}&nonce=${requestNonce}`
      })
    }, err => {
      if (err) {
        throw new Error('Failed to create protocol: beaker. ' + err)
      }
    }
  )

  // create the internal beaker HTTP server
  var server = http.createServer(beakerServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => { serverPort = port })
}

// internal methods
// =

async function beakerServer (req, res) {
  var cb = once((code, status, contentType, path) => {
    res.writeHead(code, status, {
      'Content-Type': (contentType || 'text/html; charset=utf-8'),
      'Content-Security-Policy': BEAKER_CSP,
      'Access-Control-Allow-Origin': '*'
    })
    if (typeof path === 'string') {
      var rs = fs.createReadStream(path)
      rs.pipe(res)
      rs.on('error', err => {
        res.writeHead(404)
        res.end(' ') // need to put some content on the wire for some reason
      })
    } else if (typeof path === 'function') {
      res.end(path())
    } else {
      res.end(errorPage(code + ' ' + status))
    }
  })
  var queryParams = url.parse(req.url, true).query
  var requestUrl = queryParams.url
  {
    // strip off the hash
    let i = requestUrl.indexOf('#')
    if (i !== -1) requestUrl = requestUrl.slice(0, i)
  }
  {
    // strip off the query
    let i = requestUrl.indexOf('?')
    if (i !== -1) requestUrl = requestUrl.slice(0, i)
  }

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce !== requestNonce) {
    return cb(403, 'Forbidden')
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
  if (requestUrl === 'beaker://assets/icons.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/icons.css'))
  }
  if (requestUrl === 'beaker://assets/font-awesome.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/fonts/font-awesome/css/font-awesome.min.css'))
  }
  if (requestUrl === 'beaker://assets/fontawesome-webfont.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fontawesome-webfont.woff2'))
  }
  if (requestUrl === 'beaker://assets/fontawesome-webfont.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fontawesome-webfont.woff'))
  }
  if (requestUrl === 'beaker://assets/fontawesome-webfont.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fontawesome-webfont.svg'))
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

  // builtin pages
  if (requestUrl === 'beaker://assets/builtin-pages.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages.css'))
  }
  if (requestUrl === 'beaker://start/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/start.html'))
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
  if (requestUrl === 'beaker://library/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/library.css'))
  }
  if (requestUrl === 'beaker://library/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/library.build.js'))
  }
  if (requestUrl === 'beaker://library/' || requestUrl.startsWith('beaker://library/')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/library.html'))
  }
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
  if (requestUrl === 'beaker://dat-sidebar/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/dat-sidebar.build.js'))
  }
  if (requestUrl === 'beaker://dat-sidebar/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/dat-sidebar.css'))
  }
  if (requestUrl === 'beaker://dat-sidebar/' || requestUrl.startsWith('beaker://dat-sidebar/')) {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/dat-sidebar.html'))
  }

  // modals
  if (requestUrl === 'beaker://create-archive-modal/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/create-archive-modal.html'))
  }
  if (requestUrl === 'beaker://create-archive-modal/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/create-archive-modal.css'))
  }
  if (requestUrl === 'beaker://create-archive-modal/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/create-archive-modal.build.js'))
  }
  if (requestUrl === 'beaker://fork-archive-modal/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/fork-archive-modal.html'))
  }
  if (requestUrl === 'beaker://fork-archive-modal/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/fork-archive-modal.css'))
  }
  if (requestUrl === 'beaker://fork-archive-modal/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/fork-archive-modal.build.js'))
  }
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
  if (requestUrl === 'beaker://select-archive-modal/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/select-archive-modal.html'))
  }
  if (requestUrl === 'beaker://select-archive-modal/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/select-archive-modal.css'))
  }
  if (requestUrl === 'beaker://select-archive-modal/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/select-archive-modal.build.js'))
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

  return cb(404, 'Not Found')
}

import {protocol} from 'electron'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import errorPage from '../../lib/error-page'
import {archivesDebugPage} from '../networks/dat/debugging'
import {getUserSetupStatus} from '../browser'

// constants
// =

// content security policies
// the hash is an inline script in the editor
const BEAKER_CSP = `
  default-src 'self' beaker:;
  img-src beaker-favicon: beaker: data: dat: http: https;
  script-src 'self' beaker: 'sha256-aXLf/pvGPNctHq2g1HINOltlg+Ke/CFsPvJrFD7IXgc=';
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
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => serverPort = port)
}

// internal methods
// =

async function beakerServer (req, res) {
  var cb = once((code, status, contentType, path) => {
    res.writeHead(code, status, {
      'Content-Type': (contentType || 'text/html'),
      'Content-Security-Policy': BEAKER_CSP,
      'Access-Control-Allow-Origin': '*'
    })
    if (typeof path === 'string') {
      fs.createReadStream(path).pipe(res)
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

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce !== requestNonce) {
    return cb(403, 'Forbidden')
  }

  // browser ui
  if (requestUrl === 'beaker://shell-window/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'shell-window.html'))
  }
  if (requestUrl === 'beaker://shell-window/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'shell-window.build.js'))
  }
  if (requestUrl === 'beaker://shell-window/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/shell-window.css'))
  }
  if (requestUrl === 'beaker://assets/icons.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/icons.css'))
  }
  if (requestUrl === 'beaker://assets/font-awesome.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/fonts/font-awesome/css/font-awesome.min.css'))
  }
  if (requestUrl === 'beaker://assets/fontawesome-webfont.woff2') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'assets/fonts/fontawesome-webfont.woff2'))
  }
  if (requestUrl === 'beaker://assets/fontawesome-webfont.woff') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'assets/fonts/fontawesome-webfont.woff'))
  }
  if (requestUrl === 'beaker://assets/fontawesome-webfont.svg') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'assets/fonts/fontawesome-webfont.svg'))
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
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages.css'))
  }
  if (requestUrl === 'beaker://start/') {
    let status = await getUserSetupStatus()
    if (status !== 'finished') {
      // serve the setup if the user isnt finished with setup
      return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/setup.html'))
    }
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/start.html'))
  }
  if (requestUrl === 'beaker://start/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/start.css'))
  }
  if (requestUrl === 'beaker://start/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/start.build.js'))
  }
  if (requestUrl === 'beaker://setup/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/setup.css'))
  }
  if (requestUrl === 'beaker://setup/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/setup.build.js'))
  }
  if (requestUrl === 'beaker://bookmarks/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/bookmarks.html'))
  }
  if (requestUrl === 'beaker://bookmarks/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/bookmarks.build.js'))
  }
  if (requestUrl === 'beaker://history/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/history.html'))
  }
  if (requestUrl === 'beaker://history/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/history.build.js'))
  }
  if (requestUrl === 'beaker://downloads/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/downloads.html'))
  }
  if (requestUrl === 'beaker://downloads/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/downloads.build.js'))
  }
  if (requestUrl === 'beaker://settings/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/settings.html'))
  }
  if (requestUrl === 'beaker://settings/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/settings.build.js'))
  }

  // editor
  // =
  if (requestUrl === 'beaker://editor/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/editor.css'))
  }
  if (requestUrl === 'beaker://editor/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/editor.build.js'))
  }
  if (requestUrl === 'beaker://editor/worker-proxy.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/editor-worker-proxy.js'))
  }
  if (requestUrl.startsWith('beaker://editor/min/')) {
    let subpath = requestUrl.slice('beaker://editor/min/'.length).replace(/\.\./g, '')
    subpath = subpath.split('#')[0]
    var type = 'application/javascript'
    if (subpath.endsWith('css')) type = 'text/css'
    if (subpath.endsWith('svg')) type = 'image/svg+xml'
    return cb(200, 'OK', type, path.join(__dirname, 'node_modules/monaco-editor/min/', subpath))
  }
  if (requestUrl === 'beaker://editor/' || requestUrl.startsWith('beaker://editor/')) {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/editor.html'))
  }

  // modals
  if (requestUrl === 'beaker://create-archive-modal/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/create-archive-modal.html'))
  }
  if (requestUrl === 'beaker://create-archive-modal/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/create-archive-modal.css'))
  }
  if (requestUrl === 'beaker://create-archive-modal/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/create-archive-modal.build.js'))
  }
  if (requestUrl === 'beaker://fork-archive-modal/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/fork-archive-modal.html'))
  }
  if (requestUrl === 'beaker://fork-archive-modal/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/fork-archive-modal.css'))
  }
  if (requestUrl === 'beaker://fork-archive-modal/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/fork-archive-modal.build.js'))
  }

  // debugging
  if (requestUrl === 'beaker://internal-archives/') {
    return cb(200, 'OK', 'text/html', archivesDebugPage)
  }

  return cb(404, 'Not Found')
}

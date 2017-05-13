import {app, protocol} from 'electron'
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
  if (requestUrl === 'beaker://assets/website.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/website.png'))
  }
  if (requestUrl === 'beaker://assets/network.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/network.png'))
  }
  if (requestUrl === 'beaker://assets/share-files.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/share-files.png'))
  }
  if (requestUrl === 'beaker://assets/new-site-dropdown.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/new-site-dropdown.png'))
  }
  if (requestUrl === 'beaker://assets/new-site-editor.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/new-site-editor.png'))
  }
  if (requestUrl === 'beaker://assets/new-site-save.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/new-site-save.png'))
  }
  if (requestUrl === 'beaker://assets/new-site-done.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/new-site-done.png'))
  }
  if (requestUrl === 'beaker://assets/share-files-start.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/share-files-start.png'))
  }
  if (requestUrl === 'beaker://assets/share-files-upload.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/share-files-upload.png'))
  }
  if (requestUrl === 'beaker://assets/share-files-done.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/share-files-done.png'))
  }
  if (requestUrl === 'beaker://assets/note-start.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/note-start.png'))
  }
  if (requestUrl === 'beaker://assets/note-write.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/note-write.png'))
  }
  if (requestUrl === 'beaker://assets/note-done.png') {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/note-done.png'))
  }

  // builtin pages
  if (requestUrl === 'beaker://assets/builtin-pages.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages.css'))
  }
  if (requestUrl === 'beaker://start/') {
    // TODO re-enable
    /*let status = await getUserSetupStatus()
    if (status !== 'finished') {
      // serve the setup if the user isnt finished with setup
      return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/setup.html'))
    }*/
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/start.html'))
  }
  if (requestUrl === 'beaker://start/background-image') {
    return cb(200, 'OK', 'image/png', path.join(app.getPath('userData'), 'start-background-image'))
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
  if (requestUrl === 'beaker://library/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/library.css'))
  }
  if (requestUrl === 'beaker://library/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/library.build.js'))
  }
  if (requestUrl === 'beaker://library/' || requestUrl.startsWith('beaker://library/')) {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/library.html'))
  }
  if (requestUrl === 'beaker://view-source/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/view-source.css'))
  }
  if (requestUrl === 'beaker://view-source/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/view-source.build.js'))
  }
  if (requestUrl === 'beaker://view-source/' || requestUrl.startsWith('beaker://view-source/')) {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/view-source.html'))
  }
  if (requestUrl === 'beaker://settings/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/settings.html'))
  }
  if (requestUrl === 'beaker://settings/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/settings.build.js'))
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
  if (requestUrl === 'beaker://prompt-modal/') {
    return cb(200, 'OK', 'text/html', path.join(__dirname, 'builtin-pages/prompt-modal.html'))
  }
  if (requestUrl === 'beaker://prompt-modal/main.css') {
    return cb(200, 'OK', 'text/css', path.join(__dirname, 'stylesheets/builtin-pages/prompt-modal.css'))
  }
  if (requestUrl === 'beaker://prompt-modal/main.js') {
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, 'builtin-pages/build/prompt-modal.build.js'))
  }

  // debugging
  if (requestUrl === 'beaker://internal-archives/') {
    return cb(200, 'OK', 'text/html', archivesDebugPage)
  }

  return cb(404, 'Not Found')
}

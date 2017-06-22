import {app, protocol} from 'electron'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import errorPage from '../../lib/error-page'

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
  protocol.registerHttpProtocol('term',
    (request, cb) => {
      // send requests to the protocol server
      cb({
        method: request.method,
        url: `http://localhost:${serverPort}/?url=${encodeURIComponent(request.url)}&nonce=${requestNonce}`
      })
    }, err => {
      if (err) {
        throw new Error('Failed to create protocol: term. ' + err)
      }
    }
  )

  // create the internal term HTTP server
  var server = http.createServer(termServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => serverPort = port)
}

// internal methods
// =

async function termServer (req, res) {
  var cb = once((code, status, contentType, path) => {
    res.writeHead(code, status, {
      'Content-Type': (contentType || 'text/html; charset=utf-8'),
      'Access-Control-Allow-Origin': '*'
    })
    if (typeof path === 'string') {
      var rs = fs.createReadStream(path)
      rs.pipe(res)
      rs.on('error', err => {
        res.writeHead(404)
        res.end(' ') // need to put some content on the wire for some reason
      })
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

  // interface
  if (requestUrl === 'term://_internal/main.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/builtin-pages/term.css'))
  }
  if (requestUrl === 'term://_internal/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'builtin-pages/build/term.build.js'))
  }
  if (requestUrl === 'term://_internal/env.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'term-fallback-env.build.js'))
  }
  if (requestUrl === 'term://_internal/theme.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'stylesheets/term-fallback-theme.css'))
  }
  if (requestUrl.startsWith('term://')) {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'builtin-pages/term.html'))
  }

  return cb(404, 'Not Found')
}

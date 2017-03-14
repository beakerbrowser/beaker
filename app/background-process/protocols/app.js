import {protocol} from 'electron'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import {getServerInfo as getDatServerInfo} from './dat'
import * as appsDb from '../dbs/apps'
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
  protocol.registerHttpProtocol('app',
    async function (request, cb) {
      // look up the app
      var args
      var urlp = url.parse(request.url)
      var appBinding = await appsDb.get(0, urlp.hostname)
      if (appBinding) {
        // route to the dat server
        args = getDatServerInfo()
        args.url = appBinding.url + urlp.path
      } else {
        // use the app fallback server
        args = {
          url: request.url,
          serverPort,
          requestNonce
        }
      }

      // send requests to the protocol server
      cb({
        method: request.method,
        url: `http://localhost:${args.serverPort}/?url=${encodeURIComponent(args.url)}&nonce=${args.requestNonce}`
      })
    }, err => {
      if (err) {
        throw new Error('Failed to create protocol: app. ' + err)
      }
    }
  )

  // create the internal app HTTP server
  var server = http.createServer(appServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => serverPort = port)
}

// internal methods
// =

function appServer (req, res) {
  var cb = once((code, status, contentType, path) => {
    res.writeHead(code, status, {
      'Content-Type': (contentType || 'text/html')
    })
    if (typeof path === 'string') {
      fs.createReadStream(path).pipe(res)
    } else if (typeof path === 'function') {
      res.end(path())
    } else {
      res.end(errorPage(code + ' ' + status))
    }
  })

  // TODO

  return cb(404, 'Not Found')
}
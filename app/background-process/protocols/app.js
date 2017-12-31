import {protocol} from 'electron'
import url from 'url'
import querystring from 'querystring'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import * as appsDb from '../dbs/apps'
import * as scopedFsServer from '../../lib/bg/scoped-fs-server'

// globals
// =

var serverPort // port assigned to us
var requestNonce // used to limit access to the server from the outside

// content security policies
const CSP = `
default-src 'self' dat: https: wss: data: blob:;
script-src 'self' dat: https: 'unsafe-eval' 'unsafe-inline' data: blob:;
style-src 'self' dat: https: 'unsafe-inline' data: blob:;
object-src 'none';
`.replace(/\n/g, ' ')

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
      if (appBinding && appBinding.url.startsWith('dat://')) {
        // route to the dat server
        args = null //getDatServerInfo() TODO removeme
        args.url = appBinding.url + urlp.path
        args.qs = querystring.stringify({
          url: args.url,
          nonce: args.requestNonce
        })
      } else {
        // route to the app server
        args = {
          qs: querystring.stringify({
            requestUrl: request.url,
            rootPath: appBinding ? appBinding.url.slice('file://'.length) : '',
            nonce: requestNonce
          }),
          serverPort
        }
      }

      // send requests to the protocol server
      cb({
        method: request.method,
        url: `http://localhost:${args.serverPort}/?${args.qs}`
      })
    }, err => {
      if (err) {
        throw new Error('Failed to create protocol: app. ' + err)
      }
    }
  )

  // create the internal app HTTP server
  var server = http.createServer(scopedFsServer.create({CSP, requestNonce}))
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => { serverPort = port })
}

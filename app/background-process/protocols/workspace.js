import {protocol} from 'electron'
import url from 'url'
import querystring from 'querystring'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import * as workspacesDb from '../dbs/workspaces'
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
  protocol.registerHttpProtocol('workspace',
    async function (request, cb) {
      // look up the workspace
      var urlp = url.parse(request.url)
      var wsEntry = await workspacesDb.get(0, urlp.hostname)

      // send requests to the protocol server
      const qs = querystring.stringify({
        requestUrl: request.url,
        rootPath: wsEntry ? wsEntry.localFilesPath : '',
        nonce: requestNonce
      })
      cb({
        method: request.method,
        url: `http://localhost:${serverPort}/?${qs}`
      })
    }, err => {
      if (err) {
        throw new Error('Failed to create protocol: workspace. ' + err)
      }
    }
  )

  // create the internal workspace HTTP server
  var server = http.createServer(scopedFsServer.create({CSP, requestNonce}))
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => { serverPort = port })
}

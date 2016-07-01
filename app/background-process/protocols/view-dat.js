import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import path from 'path'
import http from 'http'
import listenRandomPort from 'listen-random-port'
import log from '../../log'
import * as dat from '../networks/dat'
import renderArchive from './view-dat/archive-html'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30s

// standard CSP
const CSP = "default-src 'self' beaker:; img-src 'self' data:; plugin-types 'none';"

// globals
// =

var viewdatServerPort = null // assigned by listen-random-port
var nonce = Math.random() // used to limit access to the current process

// exported api
// =

export function setup () {
  var server = http.createServer(viewdatServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => viewdatServerPort = port)
  protocol.registerHttpProtocol('view-dat', viewdatHttpProtocol, e => {
    if (e)
      console.error('Failed to register view-dat protocol', e)
  })
}

function viewdatHttpProtocol (request, cb) {
  // send it on over to viewdatServer!
  cb({
    method: request.method,
    url: 'http://localhost:'+viewdatServerPort+'/?url='+encodeURIComponent(request.url)+'&nonce='+nonce
  })
}

function viewdatServer (req, res) {
  var cb = once((code, status) => { res.writeHead(code, status); res.end() })
  var queryParams = url.parse(req.url, true).query

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce != nonce)
    return cb(403, 'Forbidden')

  // validate request
  var urlp = url.parse(queryParams.url)
  if (!urlp.host)
    return cb(404, 'Archive Not Found')
  if (req.method != 'GET')
    return cb(405, 'Method Not Supported')

  // resolve the name
  // (if it's a hostname, do a DNS lookup)
  dat.resolveName(urlp.host, (err, archiveKey) => {
    if (err)
      return cb(404, 'Name Not Resolved')

    // start searching the network
    var archive = dat.getArchive(archiveKey)
    var ds = dat.swarm(archiveKey)

    // setup a timeout
    var timeout = setTimeout(() => {
      log('[DAT] Timed out searching for', archiveKey)
      cb(408, 'Name Not Resolved')
    }, REQUEST_TIMEOUT_MS)

    // list archive contents
    log('[DAT] attempting to list archive', archiveKey)
    archive.list((err, entries) => {
      clearTimeout(timeout)

      if (err) {
        // QUESTION: should there be a more specific error response?
        // not sure what kind of failures can occur here (other than broken pipe)
        // -prf
        log('[DAT] Archive listing errored', err)
        return cb(500, 'Failed')
      }

      // respond
      res.writeHead(200, 'OK', {
        'Content-Type': 'text/html',
        'Content-Security-Policy': CSP
      })
      res.end(new Buffer(renderArchive(archive, entries, urlp.path), 'utf-8'))
    })
  })
}
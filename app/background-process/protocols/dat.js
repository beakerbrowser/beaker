import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import http from 'http'
import listenRandomPort from 'listen-random-port'
import log from '../../log'
import errorPage from '../../lib/error-page'
import * as dat from '../networks/dat'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30s

// content security policies
const DAT_CSP = "default-src 'self'; img-src 'self' data:; plugin-types 'none';"

// globals
// =

var datServerPort = null // assigned by listen-random-port
var nonce = Math.random() // used to limit access to the current process

// exported api
// =

export function setup () {
  // setup the network & db
  dat.setup()

  // create the internal dat HTTP server
  var server = http.createServer(datServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => datServerPort = port)

  // register the dat: protocol handler
  protocol.registerHttpProtocol('dat', datHttpProtocol, e => {
    if (e)
      console.error('Failed to register dat protocol', e)
  })
}

function datHttpProtocol (request, cb) {
  // send it on over to datServer!
  cb({
    method: request.method,
    url: 'http://localhost:'+datServerPort+'/?url='+encodeURIComponent(request.url)+'&nonce='+nonce
  })
}

function datServer (req, res) {
  var cb = once((code, status) => { 
    res.writeHead(code, status, { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'unsafe-inline';" })
    res.end(errorPage(code + ' ' + status))
  })
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
    dat.swarm(archiveKey)

    // setup a timeout
    var timeout = setTimeout(() => {
      log('[DAT] Timed out searching for', archiveKey)
      cb(408, 'Timed out')
    }, REQUEST_TIMEOUT_MS)

    archive.open(err => {
      if (err) {
        log('[DAT] Failed to open archive', archiveKey, err)
        return cb(500, 'Failed')
      }

      // lookup entry
      log('[DAT] attempting to lookup', archiveKey)
      var filepath = decodeURIComponent(urlp.path)
      if (!filepath || filepath == '/')          filepath = 'index.html'
      if (filepath && filepath.charAt(0) == '/') filepath = filepath.slice(1)
      archive.lookup(filepath, (err, entry) => {
        // not found
        if (!entry) {
          log('[DAT] Entry not found:', urlp.path)
          clearTimeout(timeout)

          // if we're looking for a directory, redirect to view-dat
          if (!urlp.path || urlp.path.charAt(urlp.path.length - 1) == '/') {

            // the following code crashes the shit out of electron (https://github.com/electron/electron/issues/6492)
            // res.writeHead(302, 'Found', { 'Location': 'view-dat://'+archiveKey+urlp.path })
            // return res.end()

            // use the html redirect instead, for now
            res.writeHead(200, 'OK', {
              'Content-Type': 'text/html',
              'Content-Security-Policy': DAT_CSP
            })
            res.end('<meta http-equiv="refresh" content="0;URL=view-dat://'+archiveKey+urlp.path+'">')
            return
          }

          return cb(404, 'File Not Found')
        }

        // fetch the entry
        // TODO handle stream errors
        log('[DAT] Entry found:', urlp.path)
        dat.getAndIdentifyEntry(archive, entry, (err, entryInfo) => {
          clearTimeout(timeout)
          if (err) {
            log('[DAT] Error', err)
            return cb(500, err.toString())
          }

          // respond
          res.writeHead(200, 'OK', {
            'Content-Type': entryInfo.mimeType,
            'Content-Security-Policy': DAT_CSP
          })
          res.end(entryInfo.data)
        })         
      })
    })
  })
}
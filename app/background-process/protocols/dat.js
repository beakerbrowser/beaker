import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import http from 'http'
import listenRandomPort from 'listen-random-port'
import log from '../../log'
import errorPage from '../../lib/error-page'
import * as dat from '../networks/dat'
import renderArchive from './view-dat/archive-html'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30s

// content security policies
const CSP = "default-src 'self'; img-src 'self' data:; plugin-types 'none';"

// globals
// =

var datServerPort = null // assigned by listen-random-port
var nonce = Math.random() // used to limit access to the current process

// exported api
// =

export function setup () {
  var server = http.createServer(datServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => datServerPort = port)
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

    // list archive contents
    log('[DAT] attempting to list archive', archiveKey)
    archive.list((err, entries) => {
      if (err) {
        // QUESTION: should there be a more specific error response?
        // not sure what kind of failures can occur here (other than broken pipe)
        // -prf
        clearTimeout(timeout)
        log('[DAT] Archive listing errored', err)
        return cb(500, 'Failed')
      }
      
      // lookup the entry
      log('[DAT] Archive listing found for', archiveKey)
      var entry = dat.lookupEntry(entries, urlp.path)
      if (!entry) {
        log('[DAT] Entry not found:', urlp.path)

        // if we're looking for a directory, show the archive listing
        if (!urlp.path || urlp.path.charAt(urlp.path.length - 1) == '/') {
          res.writeHead(200, 'OK', {
            'Content-Type': entryInfo.mimeType,
            'Content-Security-Policy': CSP
          })
          return res.end(new Buffer(renderArchive(archive, entries, urlp.path), 'utf-8'))
        }

        clearTimeout(timeout)
        return cb(404, 'File Not Found')
      }

      // fetch the entry
      // TODO handle stream errors
      log('[DAT] Entry found:', urlp.path)
      dat.getEntry(archive, entry, (err, entryInfo) => {
        clearTimeout(timeout)

        // respond
        res.writeHead(200, 'OK', {
          'Content-Type': entryInfo.mimeType,
          'Content-Security-Policy': CSP
        })
        res.end(entryInfo.data)
      })         
    })
  })
}
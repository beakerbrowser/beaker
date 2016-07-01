import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import identify from 'identify-filetype'
import * as Unixfs from 'ipfs-unixfs'
import mime from 'mime'
import http from 'http'
import listenRandomPort from 'listen-random-port'
import errorPage from '../../lib/error-page'
import log from '../../log'
import * as ipfs from '../networks/ipfs'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30s

// content security policies
const CSP = "default-src 'self' beaker:; img-src 'self' data:; plugin-types 'none';"

// globals
// =

var ipfsServerPort = null // assigned by listen-random-port
var nonce = Math.random() // used to limit access to the current process

// exported api
// =

export function setup () {
  var server = http.createServer(ipfsServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => ipfsServerPort = port)
  protocol.registerHttpProtocol('ipfs', ipfsHttpProtocol, e => {
    if (e)
      console.error('Failed to register ipfs protocol', e)
  })
}

function ipfsHttpProtocol (request, cb) {
  // send it on over to ipfsServer!
  cb({
    method: request.method,
    url: 'http://localhost:'+ipfsServerPort+'/?url='+encodeURIComponent(request.url)+'&nonce='+nonce
  })
}


function ipfsServer (req, res) {
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
  var hostMatch = /ipfs:\/([0-9a-z]+)/i.exec(queryParams.url)
  if (!hostMatch)
    return cb(404, 'Invalid URL')
  if (req.method != 'GET')
    return cb(405, 'Method Not Supported')
  var folderKey = hostMatch[1]
  var reqPath = queryParams.url.slice(hostMatch[0].length)

  // setup a timeout
  var timeout = setTimeout(() => {
    log('[IPFS] Timed out searching for', folderKey)
    cb(408, 'Timed out')
  }, REQUEST_TIMEOUT_MS)

  // list folder contents
  log('[IPFS] Attempting to list folder', folderKey)
  ipfs.lookupLink(folderKey, reqPath, (err, link) => {
    if (err) {
      clearTimeout(timeout)

      if (err.notFound)
        return cb(404, 'File Not Found')

      // QUESTION: should there be a more specific error response?
      // not sure what kind of failures can occur here (other than broken pipe)
      // -prf
      log('[IPFS] Folder listing errored', err)
      return cb(500, 'Failed')
    }

    // fetch the data
    log('[IPFS] Link found:', reqPath || link.name)
    ipfs.getApi().object.data(link.hash, (err, marshaled) => {
      clearTimeout(timeout)

      if (err) {
        // TODO: what's the right error for this?
        log('[IPFS] Data fetch failed', err)
        return cb(500, 'Failed')
      }

      // parse the data
      var unmarshaled = Unixfs.unmarshal(marshaled)
      var data = unmarshaled.data
      
      // try to identify the type by the buffer contents
      var mimeType
      var identifiedExt = identify(data)
      if (identifiedExt)
        mimeType = mime.lookup(identifiedExt)
      if (mimeType)
        log('[IPFS] Identified entry mimetype as', mimeType)
      else {
        // fallback to using the entry name
        mimeType = mime.lookup(link.name)
        if (mimeType == 'application/octet-stream')
          mimeType = 'text/plain' // TODO look if content is textlike?
        log('[IPFS] Assumed mimetype from link name', mimeType)
      }

      res.writeHead(200, 'OK', {
        'Content-Type': mimeType,
        'Content-Security-Policy': CSP
      })
      res.end(data)
    })
  })
}
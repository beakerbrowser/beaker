import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
import Unixfs from 'ipfs-unixfs'
var debug = require('debug')('dat')

import { ProtocolSetupError } from '../../lib/const'
import { makeSafe } from '../../lib/strings'

import * as ipfs from '../networks/ipfs/ipfs'
import * as sitedataDb from '../dbs/sitedata'
import errorPage from '../../lib/error-page'
import * as mime from '../../lib/mime'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30 seconds

// content security policies
const IPFS_CSP = `
default-src 'self' fs:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' fs:;
style-src 'self' 'unsafe-inline' fs:;
img-src 'self' data: fs:;
object-src 'none';
`.replace(/\n/g, ' ')


// globals
// =

var serverPort // port assigned to us
var requestNonce // used to limit access to the server from the outside

// exported api
// =

export function setup () {
  // generate a secret nonce
  requestNonce = crypto.randomBytes(4).readUInt32LE(0)

  // setup the network
  ipfs.setup()

  // setup the protocol handler
  protocol.registerHttpProtocol('fs',
    (request, cb) => {
      // send requests to the protocol server
      cb({
        method: request.method,
        url: 'http://localhost:' + serverPort + '/?url=' + encodeURIComponent(request.url) + '&nonce=' + requestNonce
      })
    }, err => {
      if (err) throw ProtocolSetupError(err, 'Failed to create protocol: fs')
    }
  )

  // create the internal dat HTTP server
  var server = http.createServer(ipfsServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (_, port) => { serverPort = port })
}

function ipfsServer (req, res) {
  var cb = once((code, status) => {
    res.writeHead(code, status, {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "default-src 'unsafe-inline';",
      'Access-Control-Allow-Origin': '*'
    })
    res.end(errorPage(code + ' ' + status))
  })
  function redirectToFolder () {
    // header-redirects crash electron (https://github.com/electron/electron/issues/6492)
    // use this instead, for now
    res.writeHead(200, 'OK', { 'Content-Type': 'text/html', 'Content-Security-Policy': IPFS_CSP })
    res.end('<meta http-equiv="refresh" content="0;URL=fs:/'+subProtocol+'/'+folderKey+reqPath+'/">')    
  }
  var queryParams = url.parse(req.url, true).query

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce != requestNonce) {
    return cb(403, 'Forbidden')
  }

  // check if we have the daemon
  if (!ipfs.getApi()) {
    ipfs.setup() // try to setup the daemon
    return cb(500, 'IPFS Daemon not found. Start the daemon and try again.')
  }

  // validate request
  var hostMatch = /fs:\/([a-z]+)\/([0-9a-zA-Z-.]+)/i.exec(queryParams.url)
  if (!hostMatch) return cb(404, 'Invalid URL')
  var subProtocol = hostMatch[1]
  var folderKey = hostMatch[2]
  var reqPath = queryParams.url.slice(hostMatch[0].length)
  if (reqPath.indexOf('#') !== -1) {
    reqPath = reqPath.slice(0, reqPath.indexOf('#')) // strip out the hash segment
  }
  if (req.method !== 'GET') {
    return cb(405, 'Method Not Supported')
  }

  // redirect if no path, otherwise sub-resource requests will fail
  if (reqPath == '') {
    return redirectToFolder()
  }

  // stateful vars that may need cleanup
  var timeout
  function cleanup () {
    if (timeout) {
      clearTimeout(timeout)
    }
  }

  // track whether the request has been aborted by client
  // if, after some async, we find `aborted == true`, then we just stop
  var aborted = false
  req.once('aborted', () => {
    aborted = true
    cleanup()
    debug('Request aborted by client')
  })
      // list folder contents
  debug('Attempting to list folder', folderKey)
  ipfs.lookupLink(folderKey, reqPath, (err, link) => {
    if (aborted) return
    if (err) {
      cleanup()

      if (err.notFound) {
        // if we're looking for a directory, just give a file listing
        if (Array.isArray(err.links) && reqPath.charAt(reqPath.length - 1) == '/') {
          res.writeHead(200, 'OK', {
            'Content-Type': 'text/html',
            'Content-Security-Policy': "default-src 'none';"
          })
          var upLink = (reqPath == '/') ? '' : `<div><a href="..">..</a></div>`
          res.end(`<h1>File listing for ${makeSafe(reqPath)}</h1>`+upLink+err.links.map(link => {
            if (!link.name) return ''
            return `<div><a href="./${makeSafe(link.name)}">${makeSafe(link.name)}</a></div>`
          }).join(''))
          return
        }

        return cb(404, 'File Not Found')
      }
      if (err.notReady) {
        ipfs.setup() // try to setup the daemon
        return cb(500, 'IPFS Daemon not found. Start the daemon and try again.')
      }

      // QUESTION: should there be a more specific error response?
      // not sure what kind of failures can occur here (other than broken pipe)
      // -prf
      debug('Folder listing errored', err)
      return cb(500, 'Failed')
    }

    // fetch the data
    debug('Link found:', reqPath || link.name, link)
    ipfs.getApi().object.data(link.hash, (err, marshaled) => {
      if (aborted) return
      cleanup()

      if (err) {
        // TODO: what's the right error for this?
        debug('Data fetch failed', err)
        return cb(500, 'Failed')
      }

      // parse the data
      var unmarshaled = Unixfs.unmarshal(marshaled)
      var data = unmarshaled.data

      // directory? redirect with a '/' appended
      if (unmarshaled.type == 'directory') {
        return redirectToFolder()
      }
      
      // try to identify the type by the buffer contents
      var mimeType = mime.identify(link.name, data)
      res.writeHead(200, 'OK', {
        'Content-Type': mimeType,
        'Content-Security-Policy': IPFS_CSP
      })
      res.end(data)
    })
  })
}

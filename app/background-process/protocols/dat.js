import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import http from 'http'
import crypto from 'crypto'
import listenRandomPort from 'listen-random-port'
var debug = require('debug')('dat')
import rpc from 'pauls-electron-rpc'
import pda from 'pauls-dat-api'
const datDns = require('dat-dns')()

import { ProtocolSetupError } from '../../lib/const'
import datInternalAPIManifest from '../api-manifests/internal/dat-internal'
import datExternalAPIManifest from '../api-manifests/external/dat'

import * as dat from '../networks/dat/dat'
import datWebAPI from '../networks/dat/web-api'
import * as sitedataDb from '../dbs/sitedata'
import directoryListingPage from '../networks/dat/directory-listing-page'
import errorPage from '../../lib/error-page'
import * as mime from '../../lib/mime'
import { internalOnly } from '../../lib/bg/rpc'

// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 5e3 // 5 seconds

// content security policies
const DAT_CSP = `
default-src 'self' dat:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' dat:;
style-src 'self' 'unsafe-inline' dat:;
img-src 'self' data: dat:;
object-src 'none';
`.replace(/\n/g, ' ')

const CUSTOM_DAT_CSP = origins => {
  if (Array.isArray(origins)) origins = origins.map(o => `http://${o} https://${o}`).join(' ')
  else origins = ''
  return `
default-src 'self' dat:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' dat:;
style-src 'self' 'unsafe-inline' dat:;
img-src 'self' data: dat: ${origins};
font-src 'self' dat: ${origins};
media-src 'self' dat: ${origins}; 
connect-src 'self' dat: ${origins};
object-src 'none';
`.replace(/\n/g, ' ')
}

// globals
// =

var serverPort // port assigned to us
var requestNonce // used to limit access to the server from the outside

// exported api
// =

export function setup () {
  // generate a secret nonce
  requestNonce = crypto.randomBytes(4).readUInt32LE(0)

  // setup the network & db
  dat.setup()

  // wire up RPC
  rpc.exportAPI('datInternalAPI', datInternalAPIManifest, dat, internalOnly)
  rpc.exportAPI('dat', datExternalAPIManifest, datWebAPI)

  // setup the protocol handler
  protocol.registerHttpProtocol('dat',
    (request, cb) => {
      // send requests to the protocol server
      cb({
        method: request.method,
        url: 'http://localhost:' + serverPort + '/?url=' + encodeURIComponent(request.url) + '&nonce=' + requestNonce
      })
    }, err => {
      if (err) throw ProtocolSetupError(err, 'Failed to create protocol: dat')
    }
  )

  // configure chromium's permissions for the protocol
  protocol.registerServiceWorkerSchemes(['dat'])

  // create the internal dat HTTP server
  var server = http.createServer(datServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (_, port) => { serverPort = port })
}

function datServer (req, res) {
  var cb = once((code, status) => {
    res.writeHead(code, status, {
      'Content-Type': 'text/html',
      'Content-Security-Policy': "default-src 'unsafe-inline';",
      'Access-Control-Allow-Origin': '*'
    })
    res.end(errorPage(code + ' ' + status))
  })
  var queryParams = url.parse(req.url, true).query
  var fileReadStream
  var headersSent = false

  // check the nonce
  // (only want this process to access the server)
  if (queryParams.nonce != requestNonce) {
    return cb(403, 'Forbidden')
  }

  // validate request
  var urlp = url.parse(queryParams.url)
  if (!urlp.host) {
    return cb(404, 'Archive Not Found')
  }
  if (req.method !== 'GET') {
    return cb(405, 'Method Not Supported')
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

  // resolve the name
  // (if it's a hostname, do a DNS lookup)
  datDns.resolveName(urlp.host, (err, archiveKey) => {
    if (aborted) return cleanup()
    if (err) return cb(404, 'No DNS record found for ' + urlp.host)

    // start searching the network
    var archive = dat.getOrLoadArchive(archiveKey)

    // declare a redirect helper
    var redirectToViewDat = once(hashOpt => {
      hashOpt = hashOpt || ''
      // the following code crashes the shit out of electron (https://github.com/electron/electron/issues/6492)
      // res.writeHead(302, 'Found', { 'Location': 'beaker:library/'+archiveKey+urlp.path })
      // return res.end()

      // use the html redirect instead, for now
      res.writeHead(200, 'OK', {
        'Content-Type': 'text/html',
        'Content-Security-Policy': DAT_CSP,
        'Access-Control-Allow-Origin': '*'
      })
      res.end('<meta http-equiv="refresh" content="0;URL=beaker:library/' + archiveKey + urlp.path + hashOpt + '">')
      return
    })

    // setup a timeout
    timeout = setTimeout(() => {
      if (aborted) return

      // cleanup
      aborted = true
      debug('Timed out searching for', archiveKey)
      var hadFileReadStream = !!fileReadStream
      if (fileReadStream) {
        fileReadStream.destroy()
        fileReadStream = null
      }

      // respond
      if (!hadFileReadStream && (!urlp.path || urlp.path.endsWith('/') || urlp.path.endsWith('.html'))) {
        // redirect to view-dat, to give a nice interface, if this looks like a page-request
        redirectToViewDat('#timeout')
      } else {
        // error page
        cb(408, 'Timed out')
      }
    }, REQUEST_TIMEOUT_MS)

    archive.open(err => {
      if (aborted) return cleanup()
      if (err) {
        debug('Failed to open archive', archiveKey, err)
        cleanup()
        return cb(500, 'Failed')
      }

      // lookup entry
      debug('attempting to lookup', archiveKey)
      var hasExactMatch = false // if there's ever an exact match, then dont look for near-matches
      var filepath = decodeURIComponent(urlp.path)
      if (!filepath) filepath = '/index.html'
      if (filepath.indexOf('?') !== -1) filepath = filepath.slice(0, filepath.indexOf('?')) // strip off any query params
      if (filepath.endsWith('/')) filepath += 'index.html'
      const checkMatch = (entry, name) => {
        // check exact match
        if (name === filepath) {
          hasExactMatch = true
          return true
        }
        // check inexact matches
        if (!hasExactMatch) {
          // try appending .html
          if (name === filepath + '.html') return true
          // try appending .htm
          if (name === filepath + '.htm') return true
        }
      }
      pda.lookupEntry(archive, checkMatch, (err, entry) => {
        // still serving?
        if (aborted) return cleanup()

        // not found
        if (!entry) {
          debug('Entry not found:', urlp.path)
          cleanup()

          // if we're looking for a directory, render the file listing
          if (!urlp.path || urlp.path.endsWith('/')) {
            res.writeHead(200, 'OK', {
              'Content-Type': 'text/html',
              'Content-Security-Policy': DAT_CSP,
              'Access-Control-Allow-Origin': '*'
            })
            return directoryListingPage(archive, urlp.path, html => res.end(html))
          }

          return cb(404, 'File Not Found')
        }

        // fetch the permissions
        sitedataDb.getNetworkPermissions('dat://' + archiveKey).catch(err => []).then(origins => {

          // fetch the entry and stream the response
          debug('Entry found:', urlp.path)
          fileReadStream = archive.createFileReadStream(entry)
          fileReadStream
            .pipe(mime.identifyStream(entry.name, mimeType => {
              // cleanup the timeout now, as bytes have begun to stream
              cleanup()

              // send headers, now that we can identify the data
              headersSent = true
              var headers = {
                'Content-Type': mimeType,
                'Content-Security-Policy': CUSTOM_DAT_CSP(origins),
                'Access-Control-Allow-Origin': '*'
              }
              if (entry.length) headers['Content-Length'] = entry.length
              res.writeHead(200, 'OK', headers)
            }))
            .pipe(res)

          // handle empty files
          fileReadStream.once('end', () => {
            if (!headersSent) {
              debug('Served empty file')
              res.writeHead(200, 'OK', {
                'Content-Security-Policy': DAT_CSP,
                'Access-Control-Allow-Origin': '*'
              })
              res.end('\n')
              // TODO
              // for some reason, sending an empty end is not closing the request
              // this may be an issue in beaker's interpretation of the page-load ?
              // but Im solving it here for now, with a '\n'
              // -prf
            }
          })

          // handle read-stream errors
          fileReadStream.once('error', err => {
            debug('Error reading file', err)
            if (!headersSent) cb(500, 'Failed to read file')
          })

          // abort if the client aborts
          req.once('aborted', () => {
            if (fileReadStream) {
              fileReadStream.destroy()
            }
          })
        })
      })
    })
  })
}

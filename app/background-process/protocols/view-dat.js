import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import path from 'path'
import fs from 'fs'
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
const CSP = "default-src 'self' beaker:; img-src 'self' data: beaker-favicon:; plugin-types 'none';"

// globals
// =

var viewdatServerPort = null // assigned by listen-random-port
var nonce = Math.random() // used to limit access to the current process
var viewDatPageHTML // buffer containing the html of the view-dat page

// exported api
// =

export function setup () {
  // load the app HTML
  viewDatPageHTML = fs.readFileSync(path.join(__dirname, 'builtin-pages/view-dat.html'))

  // create the internal view-dat HTTP server
  var server = http.createServer(viewdatServer)
  listenRandomPort(server, { host: '127.0.0.1' }, (err, port) => viewdatServerPort = port)

  // register the view-dat: protocol handler
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
  var urlp = url.parse(queryParams.url, true)
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

    // wait for the listing to download
    // TODO

    if (urlp.query.as == 'zip') {
      // serve zip archive
      res.writeHead(200, 'OK', {
        'Content-Type': 'application/zip',
        'Content-Security-Policy': CSP
      })
      dat.createZipFileStream(archive).pipe(res)
    } else {
      // serve view-dat page
      res.writeHead(200, 'OK', {
        'Content-Type': 'text/html',
        'Content-Security-Policy': CSP
      })
      res.end(viewDatPageHTML)
    }
  })
}
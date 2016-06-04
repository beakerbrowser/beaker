import { protocol } from 'electron'
import path from 'path'
import url from 'url'
import once from 'once'
import log from '../log'

import hyperdrive from 'hyperdrive'
import memdb from 'memdb'
// TEMP:
// going to use discovery-swarm directly, for now, to get more control
// should switch back to hyperdrive-archive-swarm eventually!!
// -prf
// import swarm from 'hyperdrive-archive-swarm'
import discoverySwarm from 'discovery-swarm'
import swarmDefaults from 'datland-swarm-defaults'

import identify from 'identify-filetype'
import mime from 'mime'


// constants
// =

// how long till we give up?
const REQUEST_TIMEOUT_MS = 30e3 // 30s

// net errors
// https://cs.chromium.org/chromium/src/net/base/net_error_list.h
const FAILED = -2
const FILE_NOT_FOUND = -6
const TIMED_OUT = -7
const INVALID_URL = -300
const METHOD_NOT_SUPPORTED = -322

// validation
// 64 char hex
var DAT_ARCHIVE_KEY_REGEX = /[0-9a-f]{64}/i

// globals
// =

var drive = hyperdrive(memdb())

export function setup () {
  protocol.registerBufferProtocol('dat', (request, cb) => {
    cb = once(cb) // just to be safe

    // validate request
    var urlp = url.parse(request.url)
    var archiveKey = urlp.host
    if (DAT_ARCHIVE_KEY_REGEX.test(archiveKey) == false)
      return cb(INVALID_URL)
    if (request.method != 'GET')
      return cb(METHOD_NOT_SUPPORTED)

    // start searching the network
    log('[DAT] Swarming archive', archiveKey)
    var archive = drive.createArchive(archiveKey)
    var ds = swarm(archive)

    // setup a timeout
    var timeout = setTimeout(() => {
      log('[DAT] Timed out searching for', archiveKey)
      unswarm(ds)
      ds.removeListener('peer', onPeer) // TODO needed?
      cb(TIMED_OUT)
    }, REQUEST_TIMEOUT_MS)

    // wait for a peer
    ds.once('peer', onPeer)
    function onPeer (peer) {
      log('[DAT] Swarm peer:', peer, '('+archiveKey+')')

      // list archive contents
      log('[DAT] attempting to list archive')
      archive.list((err, entries) => {
        clearTimeout(timeout)

        if (err) {
          // QUESTION: should there be a more specific error response?
          // not sure what kind of failures can occur here (other than broken pipe)
          // -prf
          log('[DAT] Archive listing errored', err)
          return cb(FAILED)
        }
        
        // lookup the entry
        log('[DAT] Archive listing for', archiveKey, entries)
        var entry = lookupEntry(entries, urlp.path)
        if (!entry) {
          log('[DAT] Entry not found:', urlp.path)
          unswarm(ds)
          return cb(FILE_NOT_FOUND)
        }

        // fetch the entry
        // TODO handle stream errors
        log('[DAT] Entry found:', urlp.path)
        var chunks = []
        var stream = archive.createFileReadStream(entry)
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('end', () => {
          var data = Buffer.concat(chunks)

          // try to identify the type by the buffer contents
          var mimeType = mime.lookup(identify(data))
          if (mimeType)
            log('[DAT] Identified entry mimetype as', mimeType)
          else {
            // fallback to using the entry name
            mimeType = mime.lookup(entry.name)
            log('[DAT] Assumed mimetype from entry name', mimeType)
          }

          // respond
          unswarm(ds)
          cb({
            mimeType: mimeType,
            data: data
          })
        })         
      })
    }
  }, e => {
    if (e)
      console.error('Failed to register dat protocol', e)
  });
}

function swarm (archive) {
  var ds = discoverySwarm(swarmDefaults({
    stream: peer => {
      log('[DAT] Replicating with', peer.toString('hex'))
      return archive.replicate()
    }
  }))
  ds.once('listening', () => ds.join('hyperdrive-' + archive.key.toString('hex')))
  ds.listen()
  return ds
}

function unswarm (ds) {
  ds.close()
}

function lookupEntry (entries, path) {
  if (!path || path == '/')          path = 'index.html'
  if (path && path.charAt(0) == '/') path = path.slice(1)
    
  var entry
  for (var i=0; i < entries.length; i++) {
    if (entries[i].name == path)
      return entries[i]
  }
  // TODO if type != file, should look for subdir's index.html
}
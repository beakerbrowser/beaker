import { protocol } from 'electron'
import path from 'path'
import url from 'url'
import log from '../log'

import hyperdrive from 'hyperdrive'
import memdb from 'memdb'
import swarm from 'hyperdrive-archive-swarm'

import identify from 'identify-filetype'
import mime from 'mime'


// constants
// =

// net errors
// https://cs.chromium.org/chromium/src/net/base/net_error_list.h
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
    var sw = swarm(archive)

    // wait for a peer
    // TODO add timeout
    var listed = false
    sw.on('peer', function (peer) {
      log('[DAT] Swarm peer:', peer, '('+archiveKey+')')

      // list archive contents
      log('[DAT] attempting to list archive')
      archive.list((err, entries) => {
        if (listed)
          return
        listed = true
        // TODO handle err
        if (err)
          log('[DAT] Archive listing errored', err)
        
        // lookup the entry
        log('[DAT] Archive listing for', archiveKey, entries)
        var entry
        var path = urlp.path
        if (!path || path == '/')          path = 'index.html'
        if (path && path.charAt(0) == '/') path = path.slice(1)
        for (var i=0; i < entries.length; i++) {
          if (entries[i].name == path) {
            entry = entries[i]
            break
          }
        }
        // TODO if type != file, should look for subdir's index.html
        if (!entry) {
          log('[DAT] Entry not found:', path)
          // TODO exit the swarm
          return cb(FILE_NOT_FOUND)
        }

        // fetch the entry
        // TODO handle stream errors
        log('[DAT] Entry found:', path)
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

          cb({
            mimeType: mimeType,
            data: data
          })
        })         
      })
    })
  }, e => {
    if (e)
      console.error('Failed to register beaker protocol', e)
  });
}
import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import log from '../../log'
import * as dat from '../networks/dat'

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

// exported api
// =

export function setup () {
  protocol.registerBufferProtocol('dat', (request, cb) => {
    cb = once(cb) // just to be safe

    // validate request
    var urlp = url.parse(request.url)
    var archiveKey = urlp.host
    if (dat.LINK_REGEX.test(archiveKey) == false)
      return cb(INVALID_URL)
    if (request.method != 'GET')
      return cb(METHOD_NOT_SUPPORTED)

    // start searching the network
    var archive = dat.getArchive(archiveKey)
    dat.swarm(archiveKey)

    // setup a timeout
    var timeout = setTimeout(() => {
      log('[DAT] Timed out searching for', archiveKey)
      cb(TIMED_OUT)
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
        return cb(FAILED)
      }
      
      // lookup the entry
      log('[DAT] Archive listing for', archiveKey, entries)
      var entry = dat.lookupEntry(entries, urlp.path)
      if (!entry) {
        log('[DAT] Entry not found:', urlp.path)
        return cb(FILE_NOT_FOUND)
      }

      // fetch the entry
      // TODO handle stream errors
      log('[DAT] Entry found:', urlp.path)
      dat.getEntry(archive, entry, (err, entryInfo) => {
        // respond
        cb({
          mimeType: entryInfo.mimeType,
          data: entryInfo.data
        })
      })         
    })
  }, e => {
    if (e)
      console.error('Failed to register dat protocol', e)
  });
}
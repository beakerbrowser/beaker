import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import identify from 'identify-filetype'
import mime from 'mime'
import log from '../../log'
import * as ipfs from '../networks/ipfs'

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
  protocol.registerBufferProtocol('ipfs', (request, cb) => {
    cb = once(cb) // just to be safe

    // validate request
    console.log(request.url)
    var urlp = url.parse(request.url)
    // NOTE: url.parse does toLowerCase() for some ungodly reason, so we have to do this manually... !@#$
    // var folderKey = urlp.host
    var hostMatch = /ipfs:\/\/([0-9a-z]+)/i.exec(request.url)
    if (!hostMatch)
      return cb(INVALID_URL)
    var folderKey = hostMatch[1]
    if (request.method != 'GET')
      return cb(METHOD_NOT_SUPPORTED)

    // setup a timeout
    var timeout = setTimeout(() => {
      log('[IPFS] Timed out searching for', folderKey)
      cb(TIMED_OUT)
    }, REQUEST_TIMEOUT_MS)

    // list folder contents
    log('[IPFS] Attempting to list folder', folderKey)
    ipfs.lookupLink(folderKey, urlp.path, (err, link) => {
      clearTimeout(timeout)

      if (err) {
        if (err.notFound)
          return cb(FILE_NOT_FOUND)

        // QUESTION: should there be a more specific error response?
        // not sure what kind of failures can occur here (other than broken pipe)
        // -prf
        log('[IPFS] Folder listing errored', err)
        return cb(FAILED)
      }

      // fetch the data
      log('[IPFS] Link found:', urlp.path || link.name)
      ipfs.getApi().object.data(link.hash, (err, data) => {
        if (err) {
          // TODO: what's the right error for this?
          log('[IPFS] Data fetch failed', err)
          return cb(FAILED)
        }
        
        // try to identify the type by the buffer contents
        var mimeType = mime.lookup(identify(data)||'')
        if (mimeType)
          log('[IPFS] Identified entry mimetype as', mimeType)
        else {
          // fallback to using the entry name
          mimeType = mime.lookup(link.name)
          log('[IPFS] Assumed mimetype from link name', mimeType)
        }

        cb({ data: data, mimeType: mimeType })
      })
    })
  }, e => {
    if (e)
      console.error('Failed to register dat protocol', e)
  });
}
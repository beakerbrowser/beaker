import { protocol } from 'electron'
import url from 'url'
import once from 'once'
import path from 'path'
import log from '../../log'
import * as dat from '../networks/dat'
import renderArchive from './view-dat/archive-html'

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
  protocol.registerBufferProtocol('view-dat', (request, cb) => {
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
    var ds = dat.swarm(archiveKey)

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

      // sort out which directory to show
      // here's what this does:
      // / -> .
      // /foo -> .
      // /foo/ -> foo
      // /foo/bar -> foo
      var dirname = urlp.path.slice(1)
      if (dirname.charAt(dirname.length - 1) == '/')
        dirname += '.'
      dirname = path.dirname(dirname)

      // respond
      cb({
        mimeType: 'text/html',
        data: new Buffer(renderArchive(archive, entries, dirname), 'utf-8')
      })
    })
  }, e => {
    if (e)
      console.error('Failed to register dat protocol', e)
  });
}
import { join as joinPath } from 'path'
import { getStoragePathFor, downloadDat } from '../dat/index'
import { URL } from 'url'
import { promisify } from 'util'
import datDns from '../dat/dns'
import datServeResolvePath from '@beaker/dat-serve-resolve-path'
import ScopedFS from 'scoped-fs'
import * as mime from '../lib/mime'
import * as logLib from '../logger'
const logger = logLib.child({category: 'dat', subcategory: 'protocol'})

// globals
// =

var scopedFSes = {} // map of scoped filesystems, kept in memory to reduce allocations
function getFS (path) {
  if (!(path in scopedFSes)) {
    let fs = scopedFSes[path] = new ScopedFS(path)
    fs.isLocalFS = true
    fs.stat = promisify(fs.stat).bind(fs)
    fs.readdir = promisify(fs.readdir).bind(fs)
    fs.readFile = promisify(fs.readFile).bind(fs)
  }
  return scopedFSes[path]
}

/**
 * HACK
 * Electron has an issue that's causing file read streams to fail to serve
 * Reading into memory seems to resolve the issue
 * https://github.com/electron/electron/issues/21018
 * -prf
 */
import { PassThrough } from 'stream'
function intoStream (text) {
  const rv = new PassThrough()
  rv.push(text)
  rv.push(null)
  return rv
}

// exported api
// =

export function register (protocol) {
  protocol.registerStreamProtocol('dat', electronHandler)
}

export const electronHandler = async function (request, respond) {
  try {
    var urlp = new URL(request.url)
    var key = await datDns.resolveName(urlp.hostname)

    var path = getStoragePathFor(key)
    await downloadDat(key)
    var fs = getFS(path)

    var manifest = {}
    try {
      manifest = JSON.parse(await fs.readFile('/dat.json'))
    } catch (e) {
      logger.warn('Failed to fetch dat:// manifest', {key, error: e})
    }

    var entry = await datServeResolvePath(fs, manifest, request.url, request.headers.Accept)

    if (!entry) {
      return respond({
        statusCode: 404,
        headers: {'Content-Type': 'text/html'},
        data: intoStream(`<h1>File not found</h1>`)
      })
    }

    if (entry.isFile()) {
      return respond({
        statusCode: 200,
        headers: {'Content-Type': mime.identify(entry.path)},
        data: fs.createReadStream(entry.path)
      })
    }

    var files = await fs.readdir(entry.path)
    return respond({
      statusCode: 200,
      headers: {'Content-Type': 'text/html'},
      data: intoStream(`<!doctype html>
<html>
  <body>
    ${files.map(file => `<a href="${joinPath(entry.path, file)}">${file}</a>`).join('<br>\n')}
  </body>
</html>
`)})
  } catch (e) {
    logger.error('Failed to access dat', {error: e, url: request.url})
    respond({
      statusCode: 400,
      headers: {'Content-Type': 'text/html'},
      data: intoStream(`<h1>Failed to load Dat</h1><pre>${e.toString()}</pre>`)
    })
  }
}

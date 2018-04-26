import {join as joinPaths} from 'path'
import url from 'url'
import parseRange from 'range-parser'
import once from 'once'
import fs from 'fs'
import intoStream from 'into-stream'
import errorPage from '../error-page'
import {makeSafe} from '../strings'
import * as mime from '../mime'
import * as scopedFSes from './scoped-fses'
import renderDirectoryListingPage from '../../background-process/networks/dat/directory-listing-page'

// exported api
// =

export async function serve (request, respond, {CSP, scopedFSPath}) {
  // response helper
  const cb = once((statusCode, status, contentType, filepath) => {
    const headers = {
      'Content-Type': (contentType || 'text/html; charset=utf-8'),
      'Content-Security-Policy': CSP
    }
    if (typeof filepath === 'string') {
      respond({statusCode, headers, data: fs.createReadStream(filepath)})
    } else if (typeof filepath === 'function') {
      respond({statusCode, headers, data: intoStream(filepath())})
    } else {
      respond({statusCode, headers, data: intoStream(errorPage(statusCode + ' ' + status))})
    }
  })

  try {
    // read the parameters
    const requestUrl = request.url
    const requestUrlParsed = url.parse(requestUrl)
    var cspHeader = ''

    // fail if no binding url is given
    if (!scopedFSPath) {
      return cb(404, 'Not Found', 'text/html', () => errorPage(`No workspace found at ${makeSafe(requestUrlParsed.hostname)}`))
    }

    // create/get the scoped fs
    const scopedFS = scopedFSes.get(scopedFSPath)

    // read the manifest (it's needed in a couple places)
    let manifest
    try {
      manifest = await new Promise(resolve => scopedFS.readFile('/dat.json', 'utf8', (err, data) => resolve(data)))
      if (manifest) {
        manifest = JSON.parse(manifest)
      }
    } catch (e) {
      // ignore
    }

    // read manifest CSP
    if (manifest && manifest.content_security_policy && typeof manifest.content_security_policy === 'string') {
      cspHeader = manifest.content_security_policy
    }

    // lookup entry
    let requestPathname = decodeURIComponent(requestUrlParsed.pathname)
    let isFolder = requestPathname.endsWith('/')
    let entry
    const tryStat = async (path) => {
      // abort if we've already found it
      if (entry) return
      // apply the web_root config
      if (manifest && manifest.web_root) {
        if (path) {
          path = joinPaths(manifest.web_root, path)
        } else {
          path = manifest.web_root
        }
      }
      // attempt lookup
      try {
        entry = await new Promise(resolve => scopedFS.stat(path, (err, st) => resolve(st)))
        entry.path = path
      } catch (e) {}
    }
    if (isFolder) {
      await tryStat(requestPathname + 'index.html')
      await tryStat(requestPathname + 'index.md')
      await tryStat(requestPathname)
    } else {
      await tryStat(requestPathname)
      await tryStat(requestPathname + '.html') // fallback to .html
    }

    // handle folder
    if (entry && entry.isDirectory()) {
      let html = await renderDirectoryListingPage(scopedFS, requestPathname, manifest && manifest.web_root)
      return respond({
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Security-Policy': CSP
        },
        data: intoStream(html)
      })
    }

    // handle not found
    if (!entry) {
      // check for a fallback page
      if (manifest && manifest.fallback_page) {
        await tryStat(manifest.fallback_page)
      }

      if (!entry) {
        return cb(404, 'Not Found')
      }
    }

    // handle range
    let statusCode = 200
    let headers = {}
    let headersSent = false
    let range = request.headers.range && parseRange(entry.size, request.headers.range)
    headers['Accept-Ranges'] = 'bytes'
    if (range && range.type === 'bytes') {
      range = range[0] // only handle first range given
      statusCode = 206
      headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + entry.size
      headers['Content-Length'] = range.end - range.start + 1
    } else {
      if (entry.size) {
        headers['Content-Length'] = entry.size
      }
    }

    // fetch the entry and stream the response
    let fileReadStream = scopedFS.createReadStream(entry.path, range)
    var dataStream = fileReadStream
      .pipe(mime.identifyStream(entry.path, mimeType => {
        // send headers, now that we can identify the data
        headersSent = true
        Object.assign(headers, {
          'Content-Type': mimeType,
          'Content-Security-Policy': cspHeader,
          'Cache-Control': 'public, max-age: 60'
        })
        respond({statusCode, headers, data: dataStream})
      }))

    // handle empty files
    fileReadStream.once('end', () => {
      if (!headersSent) {
        respond({
          statusCode: 200,
          headers: {
            'Content-Security-Policy': cspHeader
          },
          data: intoStream('')
        })
      }
    })

    // handle read-stream errors
    fileReadStream.once('error', err => {
      if (!headersSent) cb(500, 'Failed to read file')
    })
  } catch (e) {
    cb(500, e.toString())
  }
}

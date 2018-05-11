import assert from 'assert'
import http from 'http'
import https from 'https'
import {parse as parseURL} from 'url'

// exported api

export function toHostname (url = '') {
  if (!url) return url
  if (url.indexOf('://') === -1) return url
  return parseURL(url).host || url
}

export function request (opts, body = undefined) {
  return new Promise((resolve, reject) => {
    var reqOpts = {headers: {}}

    // parse URL
    var urlp
    if (opts.hostname.indexOf('://') === -1) {
      let [hostname, port] = opts.hostname.split(':')
      let protocol = process.env.NODE_ENV === 'test' ? 'http:' : 'https:'
      if (port) port = +port
      urlp = {protocol, hostname, port}
    } else {
      urlp = parseURL(opts.hostname)
    }
    reqOpts.protocol = urlp.protocol
    reqOpts.hostname = urlp.hostname
    reqOpts.path = opts.path
    if (urlp.port) {
      reqOpts.port = urlp.port
    }

    // method
    reqOpts.method = opts.method || 'GET'

    // add any headers
    if (opts.headers) {
      for (var k in opts.headers) {
        reqOpts.headers[k] = opts.headers[k]
      }
    }

    // prepare body
    if (body) {
      body = JSON.stringify(body)
      reqOpts.headers['Content-Type'] = 'application/json'
      reqOpts.headers['Content-Length'] = Buffer.byteLength(body)
    }

    // prepare session
    if (opts.session) {
      reqOpts.headers['Authorization'] = 'Bearer ' + opts.session
    }

    // send request
    var proto = urlp.protocol === 'http:' ? http : https
    var req = proto.request(reqOpts, res => {
      var resBody = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { resBody += chunk })
      res.on('end', () => {
        if (resBody) {
          try {
            resBody = JSON.parse(resBody)
          } catch (e) {}
        }

        // reject / resolve
        if (res.statusCode >= 400) {
          var err = new Error(resBody && resBody.message ? resBody.message : 'Request failed')
          err.statusCode = res.statusCode
          err.headers = res.headers
          err.body = resBody
          reject(err)
        } else {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: resBody
          })
        }
      })
    })
    req.on('error', err => reject(new Error(err.toString())))
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

export function getAPIPathname (psaDoc, relType, desc = 'needed') {
  assert(psaDoc && typeof psaDoc === 'object', 'Invalid PSA service description document')
  assert(psaDoc.links && Array.isArray(psaDoc.links), 'Invalid PSA service description document (no links array)')
  var link = psaDoc.links.find(link => {
    var rel = link.rel
    return rel && typeof rel === 'string' && rel.indexOf(relType) !== -1
  })
  if (!link) {
    throw new Error(`Service does not provide the ${desc} API (rel ${relType})`)
  }
  var href = link.href
  assert(href && typeof href === 'string', 'Invalid PSA service description document (no href on API link)')
  if (!href.startsWith('/')) {
    var urlp = parseURL(href)
    href = urlp.pathname
  }
  return href
}
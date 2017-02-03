var debug = require('debug')('dat')
import dns from 'dns'
import url from 'url'
import https from 'https'

import { DAT_HASH_REGEX } from '../../lib/const'

export function resolveDatDNS (name, cb) {
  // is it a hash?
  if (DAT_HASH_REGEX.test(name)) {
    return cb(null, name)
  }

  // do a dns-over-https lookup
  requestRecord(name, cb)
}

function requestRecord (name, cb) {
  debug('DNS-over-HTTPS lookup for name:', name)
  https.get({
    host: name,
    path: '/.well-known/dat',
    timeout: 2000
  }, res => {
    var body = ''
    res.setEncoding('utf-8')
    res.on('data', chunk => body += chunk)
    res.on('end', () => handleResult(name, body, cb))
  }).on('error', err => {
    debug('DNS-over-HTTPS lookup failed for name:', name, err)
    return cb(err)
  })

}

function handleResult (name, body, cb) {
  const lines = body.split('\n')
  const match = /^dat:\/\/([0-9a-f]{64})/.exec(lines[0])
  if (match && match[1]) {
    debug('DNS-over-HTTPS resolved', name, 'to', match[1])
    cb(null, match[1])
  } else {
    debug('DNS-over-HTTPS failed', name, 'Must be a dat://{hash} url')
    cb(new Error('Invalid record'))
  }
}

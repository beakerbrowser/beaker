var debug = require('debug')('dat')
import dns from 'dns'
import url from 'url'
import https from 'https'
import cache from 'memory-cache-ttl'

import { DAT_HASH_REGEX, DEFAULT_DAT_DNS_TTL, MAX_DAT_DNS_TTL } from '../../lib/const'

export function resolveDatDNS (name, cb) {
  // is it a hash?
  if (DAT_HASH_REGEX.test(name)) {
    return cb(null, name)
  }

  // check the cache
  const cachedKey = cache.get(name)
  if (typeof cachedKey !== 'undefined') {
    debug('DNS-over-HTTPS cache hit for name', name, cachedKey)
    if (cachedKey) return cb(null, cachedKey)
    else return cb(new Error('DNS record not found'))
  }

  // do a dns-over-https lookup
  requestRecord(name, cb)
}

export function flushCache () {
  cache.flush()
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
    res.on('end', () => parseResult(name, body, cb))
  }).on('error', err => {
    debug('DNS-over-HTTPS lookup failed for name:', name, err)
    cache.set(name, false, 60) // cache the miss for a minute
    return cb(new Error('DNS record not found'))
  })

}

function parseResult (name, body, cb) {
  const lines = body.split('\n')
  let key, ttl

  // parse url
  try {
    key = /^dat:\/\/([0-9a-f]{64})/i.exec(lines[0])[1]
  } catch (e) {
    debug('DNS-over-HTTPS failed', name, 'Must be a dat://{hash} url')
    return cb(new Error('Invalid record'))
  }

  // parse ttl
  try {
    if (lines[1]) {
      ttl = +(/^ttl=(\d+)$/i.exec(lines[1])[1])
    }
  } catch (e) {
    debug('DNS-over-HTTPS failed to parse TTL for %s, line: %s, error:', name, lines[1], e)
  }
  if (!Number.isSafeInteger(ttl) || ttl < 0) {
    ttl = DEFAULT_DAT_DNS_TTL
  }
  if (ttl > MAX_DAT_DNS_TTL) {
    ttl = MAX_DAT_DNS_TTL
  }

  // cache
  if (ttl !== 0) {
    cache.set(name, key, ttl)
  }
  debug('DNS-over-HTTPS resolved', name, 'to', key)
  cb(null, key)
}


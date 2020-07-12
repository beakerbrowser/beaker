/* globals window */

const URL = typeof window === 'undefined' ? require('url').URL : window.URL
export const DRIVE_KEY_REGEX = /[0-9a-f]{64}/i

export function ucfirst (str) {
  if (!str) str = ''
  if (typeof str !== 'string') str = '' + str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function pluralize (num, base, suffix = 's') {
  if (num === 1) { return base }
  return base + suffix
}

export function shorten (str, n = 6) {
  if (str.length > (n + 3)) {
    return str.slice(0, n) + '...'
  }
  return str
}

export function shortenHash (str, n = 6) {
  if (str.startsWith('hyper://')) {
    return 'hyper://' + shortenHash(str.slice('hyper://'.length).replace(/\/$/, '')) + '/'
  }
  if (str.length > (n + 5)) {
    return str.slice(0, n) + '..' + str.slice(-2)
  }
  return str
}

export function makeSafe (str = '') {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').replace(/"/g, '')
}

export function highlight (str = '', nonce = 0) {
  var start = new RegExp(`\\{${nonce}\\}`, 'g') // eg {500}
  var end = new RegExp(`\\{/${nonce}\\}`, 'g') // eg {/500}
  return str.replace(start, '<strong>').replace(end, '</strong>')
}

export function joinPath (...args) {
  var str = args[0]
  for (let v of args.slice(1)) {
    v = v && typeof v === 'string' ? v : ''
    let left = str.endsWith('/')
    let right = v.startsWith('/')
    if (left !== right) str += v
    else if (left) str += v.slice(1)
    else str += '/' + v
  }
  return str
}

export function getHostname (str) {
  try {
    const u = new URL(str)
    if (u.protocol === 'hyper:' && u.hostname.length === 64) {
      return 'hyper://' + shortenHash(u.hostname)
    }
    return u.hostname
  } catch (e) {
    return str
  }
}

export function toNiceUrl (str) {
  if (!str) return ''
  try {
    var urlParsed = new URL(str)
    if (DRIVE_KEY_REGEX.test(urlParsed.hostname)) {
      urlParsed.hostname = `${urlParsed.hostname.slice(0, 6)}..${urlParsed.hostname.slice(-2)}`
    }
    return urlParsed.toString()
  } catch (e) {
    // ignore, not a url
  }
  return str
}

const reservedChars = /[^A-Za-z0-9]/g
const continuousDashes = /(-[-]+)/g
const endingDashes = /([-]+$)/g
export function slugify (str = '') {
  return str.replace(reservedChars, '-').replace(continuousDashes, '-').replace(endingDashes, '')
}

export function slugifyUrl (str = '') {
  try {
    let url = new URL(str)
    str = url.protocol + url.hostname + url.pathname + url.search + url.hash
  } catch (e) {
    // ignore
  }
  return slugify(str)
}

export function toHex (buf) {
  return buf.reduce((memo, i) => (
    memo + ('0' + i.toString(16)).slice(-2) // pad with leading 0 if <16
  ), '')
}

export function globToRegex (str = '') {
  if (!str.startsWith('/')) {
    str = `**/${str}`
  }
  str = str.replace(/(\*\*?)/g, match => {
    if (match === '**') return '.*'
    return '[^/]*'
  })
  return new RegExp(`^${str}(/.*)?$`)
}
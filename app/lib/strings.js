/* globals window */

const URL = typeof window === 'undefined' ? require('url').URL : window.URL

export function getPermId (permissionToken) {
  return permissionToken.split(':')[0]
}

export function getPermParam (permissionToken) {
  return permissionToken.split(':').slice(1).join(':')
}

export function ucfirst (str) {
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
  if (str.startsWith('dat://')) {
    return 'dat://' + shortenHash(str.slice('dat://'.length).replace(/\/$/, '')) + '/'
  }
  if (str.length > (n + 5)) {
    return str.slice(0, n) + '..' + str.slice(-2)
  }
  return str
}

export function makeSafe (str) {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').replace(/"/g, '')
}

export function getHostname (str) {
  try {
    const u = new URL(str)
    if (u.protocol === 'dat:' && u.hostname.length === 64) {
      return 'dat://' + shortenHash(u.hostname)
    }
    return u.hostname
  } catch (e) {
    return str
  }
}

/* globals window */

const URL = typeof window === 'undefined' ? require('url').URL : window.URL
export const DAT_KEY_REGEX = /[0-9a-f]{64}/i

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
  if (str.startsWith('dat://')) {
    return 'dat://' + shortenHash(str.slice('dat://'.length).replace(/\/$/, '')) + '/'
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

export function toNiceUrl (str) {
  if (!str) return ''
  try {
    var urlParsed = new URL(str)
    if (DAT_KEY_REGEX.test(urlParsed.hostname)) {
      urlParsed.hostname = `${urlParsed.hostname.slice(0, 4)}..${urlParsed.hostname.slice(-2)}`
    }
    return urlParsed.toString()
  } catch (e) {
    // ignore, not a url
  }
  return str
}
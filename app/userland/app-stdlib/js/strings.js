export const DRIVE_KEY_REGEX = /[0-9a-f]{64}/i

export function urlToKey (str) {
  try {
    return DRIVE_KEY_REGEX.exec(str)[0]
  } catch (e) {
    return ''
  }
}

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

export function shortenAllKeys (str = '') {
  return str.replace(/[0-9a-f]{64}/ig, (key) => `${key.slice(0, 4)}..${key.slice(-2)}`)
}

export function toDomain (str) {
  if (!str) return ''
  try {
    var urlParsed = new URL(str)
    return urlParsed.hostname
  } catch (e) {
    // ignore, not a url
  }
  return str
}

export function toNiceDomain (str, len=4) {
  var domain = toDomain(str)
  if (DRIVE_KEY_REGEX.test(domain)) {
    domain = `${domain.slice(0, len)}..${domain.slice(-2)}`
  }
  return domain
}

export function toNiceUrl (str) {
  if (!str) return ''
  try {
    var urlParsed = new URL(str)
    if (DRIVE_KEY_REGEX.test(urlParsed.hostname)) {
      urlParsed.hostname = `${urlParsed.hostname.slice(0, 4)}..${urlParsed.hostname.slice(-2)}`
    }
    return urlParsed.toString()
  } catch (e) {
    // ignore, not a url
  }
  return str
}

export function makeSafe (str = '') {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

// search results are returned from beaker's search APIs with nonces wrapping the highlighted sections
// e.g. a search for "test" might return "the {500}test{/500} result"
// this enables us to safely escape the HTML, then replace the nonces with <strong> tags
export function highlightSearchResult (str = '', nonce = 0) {
  var start = new RegExp(`\\{${nonce}\\}`, 'g') // eg {500}
  var end = new RegExp(`\\{/${nonce}\\}`, 'g') // eg {/500}
  return makeSafe(str).replace(start, '<strong>').replace(end, '</strong>')
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

const reservedChars = /[ <>:"/\\|?*\x00-\x1F]/g
const endingDashes = /([-]+$)/g
export function slugify (str = '') {
  return str.replace(reservedChars, '-').replace(endingDashes, '')
}

export function normalizeUrl (str = '') {
  try {
    let url = new URL(str)
    let res = url.protocol + '//' + url.hostname
    if (url.port) res += ':' + url.port
    res += url.pathname.replace(/(\/)$/, '') || '/'
    if (url.search && url.search !== '?') res += url.search
    if (url.hash && url.hash !== '#') res += url.hash
    return res
  } catch (e) {
    return str
  }
}

export function changeURLScheme (url = '', scheme = '') {
  try {
    let urlp = new URL(url)
    urlp.protocol = scheme
    return urlp.toString()
  } catch (e) {
    return url
  }
}

export function toNiceDriveType (type = '') {
  if (!type) return 'files drive'
  if (type === 'webterm.sh/cmd-pkg') return 'webterm command'
  return type
}

export function getDriveTypeIcon (type = '') {
  switch (type) {
    case 'user': return 'fas fa-user'
    case 'group': return 'fas fa-users'
    case 'webterm.sh/cmd-pkg': return 'fas fa-terminal'
    case 'module': return 'fas fa-cube'
    case 'website': return 'fas fa-desktop'
    default: return 'far fa-folder-open'
  }
}

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {boolean} [asString=false] set to true to return the hash value as 8-digit hex string instead of an integer
 * @param {number} [seed] optionally pass the hash of the previous chunk
 * @returns {number | string}
 */
export function hashFnv32a (str, asString, seed) {
  var i, l, hval = (seed === undefined) ? 0x811c9dc5 : seed

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i)
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24)
  }
  if (asString) {
    // Convert to 8 digit hex string
    return ("0000000" + (hval >>> 0).toString(16)).substr(-8)
  }
  return hval >>> 0
}
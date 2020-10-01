const isNode = typeof window === 'undefined'
const parse = isNode ? require('url').parse : browserParse
import { slugify } from './strings'

export const isDatHashRegex = /^[a-z0-9]{64}/i
const isIPAddressRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/
const isPath = /^\//
const URL_RE = /^[\S]+:\/\/[\S]+$/i

// helper to determine what the user may be inputting into the locaiton bar
export function examineLocationInput (v) {
  // does the value look like a url?
  var isProbablyUrl = (!v.includes(' ') && (
    isPath.test(v) ||
    /\.[A-z]/.test(v) ||
    isIPAddressRegex.test(v) ||
    isDatHashRegex.test(v) ||
    v.startsWith('localhost') ||
    v.includes('://') ||
    v.startsWith('beaker:') ||
    v.startsWith('data:') ||
    v.startsWith('intent:') ||
    v.startsWith('about:')
  ))
  var vWithProtocol = v
  var isGuessingTheScheme = false
  if (isProbablyUrl && !isPath.test(v) && !v.includes('://') && !(v.startsWith('beaker:') || v.startsWith('data:') || v.startsWith('intent:') || v.startsWith('about:'))) {
    if (isDatHashRegex.test(v)) {
      vWithProtocol = 'hyper://' + v
    } else if (v.startsWith('localhost') || isIPAddressRegex.test(v)) {
      vWithProtocol = 'http://' + v
    } else {
      vWithProtocol = 'https://' + v
      isGuessingTheScheme = true // note that we're guessing so that, if this fails, we can try http://
    }
  }
  var vSearch = '?q=' + v.split(' ').map(encodeURIComponent).join('+')
  return {vWithProtocol, vSearch, isProbablyUrl, isGuessingTheScheme}
}

const SCHEME_REGEX = /[a-z]+:\/\//i
//                   1          2      3        4
const VERSION_REGEX = /^(hyper:\/\/)?([^/]+)(\+[^/]+)(.*)$/i
export function parseDriveUrl (str, parseQS) {
  // prepend the scheme if it's missing
  if (!SCHEME_REGEX.test(str)) {
    str = 'hyper://' + str
  }

  var parsed, version = null, match = VERSION_REGEX.exec(str)
  if (match) {
    // run typical parse with version segment removed
    parsed = parse((match[1] || '') + (match[2] || '') + (match[4] || ''), parseQS)
    version = match[3].slice(1)
  } else {
    parsed = parse(str, parseQS)
  }
  if (isNode) parsed.href = str // overwrite href to include actual original
  else parsed.path = parsed.pathname // to match node
  if (!parsed.query && parsed.searchParams) {
    parsed.query = Object.fromEntries(parsed.searchParams) // to match node
  }
  parsed.version = version // add version segment
  if (!parsed.origin) parsed.origin = `hyper://${parsed.hostname}/`
  return parsed
}

function browserParse (str) {
  return new URL(str)
}

export function createResourceSlug (href, title) {
  var slug
  try {
    var hrefp = new URL(href)
    if (hrefp.pathname === '/' && !hrefp.search && !hrefp.hash) {
      // at the root path - use the hostname for the filename
      slug = slugify(hrefp.hostname)
    } else if (typeof title === 'string' && !!title.trim()) {
      // use the title if available on subpages
      slug = slugify(title.trim())
    } else {
      // use parts of the url
      slug = slugify(hrefp.hostname + hrefp.pathname + hrefp.search + hrefp.hash)
    }
  } catch (e) {
    // weird URL, just use slugified version of it
    slug = slugify(href)
  }
  return slug.toLowerCase()
}

/**
 * @param {String} str 
 * @returns {String}
 */
export function normalizeOrigin (str) {
  try {
    let {protocol, hostname, port} = new URL(str)
    return `${protocol}//${hostname}${(port ? `:${port}` : '')}`
  } catch {
    // assume hyper, if this fails then bomb out
    let {protocol, hostname, port} = new URL(`hyper://${str}`)
    return `${protocol}//${hostname}${(port ? `:${port}` : '')}`
  }
}

/**
 * @param {String} a 
 * @param {String} b 
 * @returns {Boolean}
 */
export function isSameOrigin (a, b) {
	return normalizeOrigin(a) === normalizeOrigin(b)
}

/**
 * @param {String} url
 * @param {String} [base]
 * @returns {String}
 */
export function normalizeUrl (url, base = undefined) {
  try {
    let {protocol, hostname, port, pathname, search, hash} = new URL(url, base)
    return `${protocol}//${hostname}${(port ? `:${port}` : '')}${pathname || '/'}${search}${hash}`
  } catch {
    return url
  }
}

/**
 * @param {String} url 
 * @returns {Boolean}
 */
export function isUrlLike (url) {
  return typeof url === 'string' && URL_RE.test(url)
}

/**
 * @param {String} url 
 * @returns {String}
 */
export function stripUrlHash (url) {
  try {
    let i = url.indexOf('#')
    if (i !== -1) return url.slice(0, i)
    return url
  } catch (e) {
    return url
  }
}
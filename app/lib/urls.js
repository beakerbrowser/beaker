const isNode = typeof window === 'undefined'
const parse = isNode ? require('url').parse : browserParse

export const isDatHashRegex = /^[a-z0-9]{64}/i
const isIPAddressRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/
const isPath = /^\//

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

const isDatHashRegex = /^[a-z0-9]{64}/i
const isIPAddressRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/

// helper to determine what the user may be inputting into the locaiton bar
export function examineLocationInput (v) {
  // does the value look like a url?
  var isProbablyUrl = (!v.includes(' ') && (
    /\.[A-z]/.test(v) ||
    isIPAddressRegex.test(v) ||
    isDatHashRegex.test(v) ||
    v.startsWith('localhost') ||
    v.includes('://') ||
    v.startsWith('beaker:') ||
    v.startsWith('data:')
  ))
  var vWithProtocol = v
  var isGuessingTheScheme = false
  if (isProbablyUrl && !v.includes('://') && !(v.startsWith('beaker:') || v.startsWith('data:'))) {
    if (isDatHashRegex.test(v)) {
      vWithProtocol = 'dat://' + v
    } else if (v.startsWith('localhost') || isIPAddressRegex.test(v)) {
      vWithProtocol = 'http://' + v
    } else {
      vWithProtocol = 'https://' + v
      isGuessingTheScheme = true // note that we're guessing so that, if this fails, we can try http://
    }
  }
  var vSearch = 'https://duckduckgo.com/?q=' + v.split(' ').map(encodeURIComponent).join('+')
  return {vWithProtocol, vSearch, isProbablyUrl, isGuessingTheScheme}
}
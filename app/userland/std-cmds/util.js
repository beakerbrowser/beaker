export const DRIVE_KEY_REGEX = /[0-9a-f]{64}/i

export function resolveParse (env, location) {
  return parseLocation(env.resolve(location))
}

export function parseLocation (location) {
  var urlp = new URL(location)
  urlp.drive = createDrive(urlp.toString())
  return urlp
}

export function joinPath (left, right) {
  left = (left || '').toString()
  right = (right || '').toString()
  if (left.endsWith('/') && right.startsWith('/')) {
    return left + right.slice(1)
  }
  if (!left.endsWith('/') && !right.startsWith('/')) {
    return left + '/' + right
  }
  return left + right
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

/*
This wrapper provides a Hyperdrive interface for non-dat sites
so that errors can be smoothly generated
*/

export function createDrive (url) {
  if (url.startsWith('hyper:')) {
    return beaker.hyperdrive.drive(url)
  }
  return new Proxy({}, {
    get (obj, k) {
      if (k === 'url') return url
      if (k === 'stat') {
        return () => {
          // fake response to just let stat() callers pass through
          return {
            isUnsupportedProtocol: true,
            isDirectory: () => true,
            isFile: () => true
          }
        }
      }
      return () => {
        let urlp = new URL(url)
        throw new Error(`${urlp.protocol} does not support this command`)
      }
    }
  })
}
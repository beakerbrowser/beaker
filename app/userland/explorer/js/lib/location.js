var url
var urlp
var isHyperViewer = false

if (location.protocol === 'hyper:') {
  isHyperViewer = true
  url = location.toString()
  urlp = new URL(url)
} else {
  url = location.pathname.slice(1) // slice past the '/'
  if (url && url.startsWith('hyper://')) {
    // remove the 'hyper://'
    history.replaceState(undefined, document.title, window.location.origin + '/' + url.slice('hyper://'.length))
  } else if (url && !url.includes('://')) {
    url = 'hyper://' + url
  }
  try {
    urlp = new URL(url)
  } catch (e) {
    urlp = {hostname: undefined, pathname: undefined}
  }
}

export function getUrl () {
  return url || undefined
}

export function setUrl (url) {
  if (isHyperViewer) {
    window.location = url
  } else {
    window.location = `/${url.replace(/^hyper:\/\//, '')}`
  }
}

export function setPath (path) {
  urlp.pathname = path
  setUrl(urlp.toString())
}

export function openUrl (url) {
  window.open(`${window.location.origin}/${url.replace(/^hyper:\/\//, '')}`)
}

export function getOrigin () {
  return urlp.origin
}

export function getHostname () {
  return urlp.hostname
}

export function getPath () {
  return urlp.pathname
}
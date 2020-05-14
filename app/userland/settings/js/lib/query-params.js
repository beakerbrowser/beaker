export function setParams (kv, clear = false, replaceState = false) {
  var url = (new URL(window.location))
  if (clear) url.search = ''
  for (var k in kv) {
    if (kv[k]) {
      url.searchParams.set(k, kv[k])
    } else {
      url.searchParams.delete(k)
    }
  }
  if (replaceState) {
    window.history.replaceState({}, null, url)
  } else {
    window.history.pushState({}, null, url)
  }
}

export function getParam (k, fallback = '') {
  return (new URL(window.location)).searchParams.get(k) || fallback
}
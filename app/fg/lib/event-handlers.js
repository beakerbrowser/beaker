/* globals Event beaker */

export function pushUrl (e) {
  // ignore ctrl/cmd+click
  if (e.metaKey) { return }

  var el = findParent(e.target, el => el.tagName === 'A')
  var url = el.getAttribute('href') || el.dataset.href

  if (url) {
    e.preventDefault()
    e.stopPropagation()
    window.history.pushState(null, '', url)
  }
}

export function findParent (node, test) {
  if (typeof test === 'string') {
    // classname default
    var cls = test
    test = el => el.classList && el.classList.contains(cls)
  }

  while (node) {
    if (test(node)) {
      return node
    }
    node = node.parentNode
  }
}

export function writeToClipboard (str) {
  var textarea = document.createElement('textarea')
  textarea.textContent = str
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function polyfillHistoryEvents () {
  // HACK FIX
  // the good folk of whatwg didnt think to include an event for pushState(), so let's add one
  // -prf
  var _wr = function (type) {
    var orig = window.history[type]
    return function () {
      var rv = orig.apply(this, arguments)
      var e = new Event(type.toLowerCase())
      e.arguments = arguments
      window.dispatchEvent(e)
      return rv
    }
  }
  window.history.pushState = _wr('pushState')
  window.history.replaceState = _wr('replaceState')
}

export function adjustWindowHeight (sel) {
  var el = sel ? document.querySelector(sel) : document.body
  var height = el.getClientRects()[0].height
  if (window.process.platform !== 'darwin') {
    // windows and linux need added height for their title bars
    height += 39
  }
  beaker.browser.setWindowDimensions({height})
}

export function emit (name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, {detail, bubbles: true, composed: true}))
}
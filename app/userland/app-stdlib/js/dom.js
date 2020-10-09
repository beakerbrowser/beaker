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

export function on (el, event, fn, opts) {
  el.addEventListener(event, fn, opts)
}

export function once (el, event, fn, opts) {
  opts = opts || {}
  opts.once = true
  el.addEventListener(event, fn, opts)
}

export function emit (el, evt, opts = {}) {
  opts.bubbles = ('bubbles' in opts) ? opts.bubbles : true
  opts.composed = ('composed' in opts) ? opts.composed : true
  el.dispatchEvent(new CustomEvent(evt, opts))
}

/*!
 * Dynamically changing favicons with JavaScript
 * Works in all A-grade browsers except Safari and Internet Explorer
 * Demo: http://mathiasbynens.be/demo/dynamic-favicons
 */

var _head = document.head || document.getElementsByTagName('head')[0] // https://stackoverflow.com/a/2995536
export function changeFavicon (src) {
  var link = document.createElement('link')
  var oldLink = document.getElementById('dynamic-favicon')
  link.id = 'dynamic-favicon'
  link.rel = 'shortcut icon'
  link.href = src
  if (oldLink) {
    _head.removeChild(oldLink)
  }
  _head.appendChild(link)
}
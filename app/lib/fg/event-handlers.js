import * as yo from 'yo-yo'

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
  var textarea = yo`<textarea>${str}</textarea>`
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function adjustWindowHeight (sel) {
  var el = sel ? document.querySelector(sel) : document.body
  beakerBrowser.setWindowDimensions({height: el.getClientRects()[0].height})
}
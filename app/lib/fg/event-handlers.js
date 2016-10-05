export function pushUrl (e) {
  var url = findParent(e.target, el => el.tagName === 'A').getAttribute('href')
  if (url) {
    e.preventDefault()
    e.stopPropagation()
    window.history.pushState(null, '', url)
  }
}

export function findParent (node, test) {
  while (node) {
    if (test(node)) {
      return node
    }
    node = node.parentNode
  }
}

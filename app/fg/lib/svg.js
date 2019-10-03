/* globals DOMParser */

export function render (str) {
  var parser = new DOMParser()
  var doc = parser.parseFromString(str, 'image/svg+xml')
  return doc.children[0]
}

export function create (ref, opts = {}) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  for (var k in opts) {
    if (k === 'cls') {
      opts[k].split(' ').forEach(v => {
        svg.classList.add(v)
      })
    } else {
      svg.setAttribute(k, opts[k])
    }
  }
  svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink')
  var use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', ref)
  svg.append(use)
  return svg
}
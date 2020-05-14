export function h (tag, attributes = {}, children) {
  var el = document.createElement(tag)
  for (let k in attributes) {
    if (k === 'className') {
      el.className = attributes[k]
    } else if (attributes[k] === true) {
      el.setAttribute(k, '')
    } else {
      el.setAttribute(k, attributes[k])
    }
  }
  if (children) {
    for (let child of (Array.isArray(children) ? children : [children])) {
      el.append(child)
    }
  }
  return el
}

export function moveChildren ({src, dst}) {
  while (src.childNodes.length > 0) {
    dst.appendChild(src.childNodes[0])
  }
}
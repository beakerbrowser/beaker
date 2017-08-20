

export function render (str) {
  var parser = new DOMParser()
  var doc = parser.parseFromString(str, "image/svg+xml")
  return doc.children[0]
}
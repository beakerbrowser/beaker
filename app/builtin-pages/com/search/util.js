import yo from 'yo-yo'

const typeToCategory = {
  'web-page': 'pages',
  'image-collection': 'images',
  'file-share': 'files',
  'other': 'other'
}

export function renderType (type) {
  return yo`<a class="type" onclick=${e => onClickType(type)}> <span>${type}</span></a>`
}

function onClickType (type) {
  var category = typeToCategory[type] || 'other'
  var url = (new URL(window.location))
  url.searchParams.set('category', category)
  window.history.pushState({}, null, url)
}
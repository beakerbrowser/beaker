/* globals hljs */

import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export default function render (fileNode) {
  // check if loading first
  if (fileNode.isLoadingPreview) {
    return yo`<div class="loading">Loading...</div>`
  }
  // check preview content
  if (fileNode.preview) {
    if (typeof window.hljs !== 'undefined') {
      let fileExt = (fileNode.name || '').split('.').pop()
      let el = yo`<div class="text"></div>`
      el.innerHTML = hljs.highlightAuto(fileNode.preview, fileExt ? [fileExt] : undefined).value
      return el
    }
    return yo`<div class="text">${fileNode.preview}</div>`
  }

  // now check for media formats
  const mimetype = mime.lookup(fileNode.name)
  const url = fileNode.url + '?cache-buster=' + Date.now() + '&disable_web_root=1'

  if (mimetype.startsWith('image/')) {
    return yo`<img src=${url} />`
  } else if (mimetype.startsWith('video/')) {
    return yo`<video controls src=${url}></video>`
  } else if (mimetype.startsWith('audio/')) {
    return yo`<audio controls src=${url}></audio>`
  }

  return null
}

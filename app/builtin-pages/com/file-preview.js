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
    let el = yo`<img id="img-preview" src=${url} />`
    el.isSameNode = (el2) => el2.id === 'img-preview'
    return el
  } else if (mimetype.startsWith('video/')) {
    let el = yo`<video id="video-preview" controls src=${url}></video>`
    el.isSameNode = (el2) => el2.id === 'video-preview'
    return el
  } else if (mimetype.startsWith('audio/')) {
    let el = yo`<audio id="audio-preview" controls src=${url}></audio>`
    el.isSameNode = (el2) => el2.id === 'audio-preview'
    return el
  }

  return null
}

/* globals hljs */

import * as yo from 'yo-yo'
import mime from 'mime'
import {render as renderFileEditor} from './file-editor'

// exported api
// =

export default function render (fileNode) {
  // check if loading first
  if (fileNode.isLoadingPreview) {
    return yo`<div class="file-view text"><div class="loading">Loading...</div></div>`
  }

  // handle textual files
  if (typeof fileNode.preview === 'string') {
    return renderFileEditor(fileNode)
  }

  // now check for media formats
  const mimetype = mime.lookup(fileNode.name)
  const url = fileNode.url + '?cache-buster=' + Date.now() + '&disable_web_root=1'

  var el
  if (mimetype.startsWith('image/')) {
    el = yo`<img id="img-preview" src=${url} />`
    el.isSameNode = (el2) => el2.id === 'img-preview'
  } else if (mimetype.startsWith('video/')) {
    el = yo`<video id="video-preview" controls src=${url}></video>`
    el.isSameNode = (el2) => el2.id === 'video-preview'
  } else if (mimetype.startsWith('audio/')) {
    el = yo`<audio id="audio-preview" controls src=${url}></audio>`
    el.isSameNode = (el2) => el2.id === 'audio-preview'
  }
  return yo`<div class="file-view media">${el || ''}</div>`
}

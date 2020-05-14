/* globals hljs */

import yo from 'yo-yo'
import mime from 'mime'
import {render as renderFileEditor} from './file-editor'
import BINARY_EXTENSIONS from 'binary-extensions'

// exported api
// =

export default function render (fileNode) {
  // check if loading first
  if (fileNode.isLoadingPreview) {
    return yo`<div class="file-view text"><div class="loading">Loading...</div></div>`
  }

  // handle textual files
  if (typeof fileNode.fileData === 'string') {
    return renderFileEditor(fileNode)
  }

  // now check for media formats
  const mimetype = mime.lookup((fileNode.name || '').toLowerCase())
  const url = fileNode._archive.url + fileNode._path + '?cache-buster=' + Date.now() + '&disable_web_root=1'
  var isBinary = false

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
  } else {
    isBinary = (
      isBinaryExtension(fileNode.name) ||
      mimetype.startsWith('application/zip') ||
      mimetype.startsWith('application/gzip') ||
      mimetype.startsWith('font/')
    )
    if (isBinary) {
      el = yo`<div class="opaque-binary">
  <code>1010100111001100
  1110100101110100
  1001010100010111</code>
      </div>`
    }
  }
  return yo`<div class="file-view media ${isBinary ? 'binary' : ''}">${el || ''}</div>`
}

function isBinaryExtension (fileName) {
  var nameParts = fileName.split('.')
  if (nameParts.length > 1) {
    var ext = nameParts.pop()
    if (ext && BINARY_EXTENSIONS.includes(ext.toLowerCase()) === true) {
      return true
    }
  }
  return false
}
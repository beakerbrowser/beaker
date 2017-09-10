import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export default function render (fileNode) {
  // check preview content first
  if (fileNode.preview) {
    return yo`<div class="text">${fileNode.preview}</div>`
  }

  // now check for media formats
  const mimetype = mime.lookup(fileNode.name)
  const url = fileNode.url + '?cache-buster=' + Date.now()

  if (mimetype.startsWith('image/')) {
    return yo`<img src=${url} />`
  } else if (mimetype.startsWith('video/')) {
    return yo`<video controls src=${url}></video>`
  } else if (mimetype.startsWith('audio/')) {
    return yo`<audio controls src=${url}></audio>`
  }

  return null
}
import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export function render (url) {
  // lookup the mimetype
  var mimetype = mime.lookup(url)
  url += '?cache-buster=' + Date.now()
  if (mimetype.startsWith('image/')) {
    return yo`
      <div class="fileview uneditable active">
        <img src=${url} />
      </div>
    `
  } else if (mimetype.startsWith('video/')) {
    return yo`
      <div class="fileview uneditable active">
        <video controls src=${url}></video>
      </div>
    `
  } else if (mimetype.startsWith('audio/')) {
    return yo`
      <div class="fileview uneditable active">
        <audio controls src=${url}></audio>
      </div>
    `
  } else {
    return yo`
      <div class="fileview uneditable active">
        Unsupported filetype, ${mimetype}
      </div>
    `
  }
  return ''
}

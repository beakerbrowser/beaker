import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export default function renderFileView (archive, opts) {
  if (opts.selectedModel.isEditable) {
    return yo`<div />`
  }
  return rUneditable(archive, opts.selectedPath)
}

// renderers
// =

function rUneditable (archive, path) {
  // lookup the mimetype
  var mimetype = mime.lookup(path)
  if (mimetype.startsWith('image/')) {
    return yo`
      <div class="uneditable-file">
        <img src=${archive.url + '/' + path} />
      </div>
    `
  } else if (mimetype.startsWith('video/')) {
    return yo`
      <div class="uneditable-file">
        <video controls width="400" src=${archive.url + '/' + path}></video>
      </div>
    `
  } else if (mimetype.startsWith('audio/')) {
    return yo`
      <div class="uneditable-file">
        <audio controls width="400" src=${archive.url + '/' + path}></audio>
      </div>
    `
  } else {
    return yo`
      <div class="uneditable-file">
        Unsupported filetype, ${mimetype}
      </div>
    `
  }
}
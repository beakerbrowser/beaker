import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export default function renderFileView (archive, opts) {
  if (!opts.selectedModel || opts.selectedModel.isEditable) {
    return yo`<div />`
  }
  return rUneditable(archive, opts.selectedPath)
}

// renderers
// =

function rHeader (archive, path) {
  return yo`
    <div class="editor-header">
      <div class="path">
        ${rFileIcon(path)}
        <span>${path}</span>
      </div>
    </div>`
}

function rFileIcon (path) {
  // lookup the mimetype
  var mimetype = mime.lookup(path)
  var cls = 'file-o'
  console.log(mimetype)

  if (mimetype.startsWith('image/')) {
    cls = 'file-image-o'
  } else if (mimetype.startsWith('video/')) {
    cls = 'file-video-o'
  } else if (mimetype.startsWith('video/')) {
    cls = 'file-video-o'
  } else if (mimetype.startsWith('audio/')) {
    cls = 'file-audio-o'
  } else if (mimetype.startsWith('text/html')) {
    cls = 'file-code-o'
  } else if (mimetype.startsWith('text/')) {
    cls = 'file-text-o'
  }

  return yo`<i class="fa fa-${cls}"></i>`
}

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
        <video controls src=${archive.url + '/' + path}></video>
      </div>
    `
  } else if (mimetype.startsWith('audio/')) {
    return yo`
      <div class="fileview uneditable">
        <audio controls src=${archive.url + '/' + path}></audio>
      </div>
    `
  } else {
    return yo`
      <div class="fileview uneditable">
        Unsupported filetype, ${mimetype}
      </div>
    `
  }
}

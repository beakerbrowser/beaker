import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export default function renderFileView (archive, opts) {
  if (!opts.selectedModel || opts.selectedModel.isEditable) {
    return yo`</div>`
  }

  return rUneditable(archive, opts.selectedPath)
}

// renderers
// =

export function rHeader (archive, path) {
  if (! (archive && path)) return ''
  return yo.update(document.querySelector('.editor-header'), yo`
    <div class="editor-header">
      <div class="path">
        ${rFileIcon(path)}
        <span>${path}</span>
      </div>
    </div>`)
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
  var el
  // lookup the mimetype
  var mimetype = mime.lookup(path)
  if (mimetype.startsWith('image/')) {
    el = yo`
      <div class="fileview uneditable active">
        <img src=${archive.url + '/' + path} />
      </div>
    `
  } else if (mimetype.startsWith('video/')) {
    el =yo`
      <div class="fileview uneditable active">
        <video controls src=${archive.url + '/' + path}></video>
      </div>
    `
  } else if (mimetype.startsWith('audio/')) {
    el = yo`
      <div class="fileview uneditable active">
        <audio controls src=${archive.url + '/' + path}></audio>
      </div>
    `
  } else {
    el = yo`
      <div class="fileview uneditable active">
        Unsupported filetype, ${mimetype}
      </div>
    `
  }

  yo.update(document.querySelector('.fileview'), el)
}

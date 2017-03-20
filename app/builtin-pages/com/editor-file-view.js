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

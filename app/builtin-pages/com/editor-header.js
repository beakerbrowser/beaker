import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export function render (archive, path, activeUrl, isActiveFileDirty) {
  if (! (archive && path)) return ''
  return yo.update(document.querySelector('.editor-header'), yo`
    <div class="editor-header">
      <div class="path">
        ${rFileIcon(path)}
        <span>${path}</span>
      </div>
      ${rActions(path, activeUrl, isActiveFileDirty)}
    </div>`)
}

// renderers
// =


function rActions (path, url, isDirty) {
  return yo`
    <div class="editor-header-actions">
      <span class="save-prompt">${isDirty ? 'Save changes' : ''}</span>
      <button
        ${!isDirty ? 'disabled' : ''}
        onclick=${e => onSaveFile(path, url)}
        class="btn transparent save"
        title="Save This File's Changes">
        <i class="fa fa-save"></i>
      </button>
    </div>
  `
}

function rFileIcon (path) {
  // lookup the mimetype
  var mimetype = mime.lookup(path)
  var cls = 'file-o'

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

function onSaveFile (path, url) {
  // dispatch an app event
  var evt = new Event('save-file')
  evt.detail = { path: path, url: url}
  window.dispatchEvent(evt)
}

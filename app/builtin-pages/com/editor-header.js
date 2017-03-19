import * as yo from 'yo-yo'
import mime from 'mime'

// exported api
// =

export function render (archive, path) {
  if (! (archive && path)) return ''
  return yo.update(document.querySelector('.editor-header'), yo`
    <div class="editor-header">
      <div class="path">
        ${rFileIcon(path)}
        <span>${path}</span>
      </div>
    </div>`)
}

// renderers
// =

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

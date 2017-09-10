import * as yo from 'yo-yo'
import renderFolderIcon from '../icon/folder-color'
import renderFileOIcon from '../icon/file-o'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'
import renderFilePreview from './file-preview'

// exported api
// =

export default function render (node) {
  const isEditingInfo = false // TODO

  // render preview
  let preview
  if (node.type === 'file') {
    preview = renderFilePreview(node)
    if (!preview) {
      preview = yo`<div class="icon-wrapper">${renderFileOIcon()}</div>`
    }
  } else {
    preview = yo`<div class="icon-wrapper">${renderFolderIcon()}</div>`
  }

  return yo`
    <div class="files-list-sidebar">
      <div class="preview">
        ${preview}
      </div>
      <div class="metadata">
        <div class="name">${node.name}</div>
        <table>
          ${node.size ? yo`<tr><td class="label">Size</td><td>${prettyBytes(node.size)}</td></tr>` : ''}
          ${node.mtime ? yo`<tr><td class="label">Updated</td><td>${niceDate(+(node.mtime || 0))}</td></tr>` : ''}
          <tr><td class="label">Editable</td><td>${node.isEditable ? 'Yes' : 'No'}</td></tr>
        </table>
      </div>
    </div>
  `
}

// event handlers
// =

function onClickEdit () {
  // TODO
}

function onSaveSettings () {
  // TODO
}
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
  const archiveInfo = node._archiveInfo
  const networked = archiveInfo.userSettings.networked

  if (!archiveInfo) return yo`<div></div>`

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
      <div class="archive-info">
        <div class="header">
          <span title="${networked ? 'Stop' : 'Start'} hosting this archive" class="archive-icon ${networked ? 'networked' : ''}">
            ${renderFolderIcon()}
          </span>
          <h1>${archiveInfo.title || 'Untitled'}</h1>
        </div>

        <div class="main">
          <p class="desc">${archiveInfo.description || yo`<em>No description</em>`}</p>
        </div>
      </div>

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
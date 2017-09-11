import * as yo from 'yo-yo'
import renderDotsIcon from '../icon/three-dots'
import renderTrashIcon from '../icon/trash'
import toggleable, {closeAllToggleables} from '../com/toggleable'

// exported api
// =

export default function render (root) {
  const archiveInfo = root._archiveInfo
  if (!archiveInfo) return yo`<div></div>`

  // set up icons and labels for save/unsave buttons
  var toggleSaveIcon, toggleSaveText
  if (archiveInfo.isOwner) {
    if (archiveInfo.userSettings.isSaved) {
      toggleSaveIcon = '' // 'fa-trash'
      toggleSaveText = 'Delete'
    } else {
      toggleSaveIcon = '' // 'fa-floppy-o'
      toggleSaveText = 'Restore'
    }
  } else {
    if (archiveInfo.userSettings.isSaved) {
      toggleSaveIcon = '' // fa-times-circle'
      toggleSaveText = 'Remove from library'
    } else {
      toggleSaveIcon = '' // fa-plus'
      toggleSaveText = 'Add to library'
    }
  }

  return yo`
    <div class="files-list-header">
      <h3>${archiveInfo.title || 'Untitled'}</h3>
      <p class="desc">${archiveInfo.description || yo`<em>No description</em>`}</p>

      ${toggleable(yo`
        <div class="dropdown-btn-container toggleable-container" data-toggle-id="archive-dropdown-menu">
          <span class="nav-item dropdown toggleable">
            ${renderDotsIcon()}
          </span>

          <div class="dropdown-btn-list">
            ${archiveInfo.isOwner ? yo`
              <div class="dropdown-item" onclick=${onImportFiles}>
                Import files
                <span class="icon">+</span>
              </div>
            ` : ''}
            <div class="dropdown-item" onclick=${onFork}>
              Fork this site
              <span class="icon">+</span>
            </div>
            <div class="dropdown-item" onclick=${onToggleSaved}>
              ${toggleSaveText}
              ${renderTrashIcon()}
            </div>
          </div>
        </div>
      `)}
    </div>
  `
}


// event handlers
// =

function onImportFiles () {
  // TODO
}

function onFork () {
  // TODO
}

function onToggleSaved () {
  // TODO
}
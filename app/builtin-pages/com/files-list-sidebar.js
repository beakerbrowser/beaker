import * as yo from 'yo-yo'
import renderDotsIcon from '../icon/three-dots'
import renderTrashIcon from '../icon/trash'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'
import toggleable, {closeAllToggleables} from '../com/toggleable'

// exported api
// =

export default function render (node) {
  const isEditingInfo = false // TODO
  const archiveInfo = node._archiveInfo
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

  // editable title and description
  var titleEl, descEl
  if (archiveInfo.isOwner && isEditingInfo) {
    titleEl = yo`
      <td>
        <input id="title" onkeyup=${settingsOnKeyup} value=${niceName(archiveInfo)} type="text"/>
      </td>
    `
    descEl = yo`
      <td>
        <input id="desc" onkeyup=${settingsOnKeyup} value=${archiveInfo.description || ''} type="text"/>
      </td>
    `
  } else if (archiveInfo.isOwner) {
    titleEl = yo`
      <td>
        ${niceName(archiveInfo)}
        <i onclick=${onClickEdit} class="fa fa-pencil"></i>
      </td>`
    descEl = yo`
      <td>
        ${niceDesc(archiveInfo)}
        <i onclick=${onClickEdit} class="fa fa-pencil"></i>
      </td>`
  } else {
    titleEl = yo`<td>${niceName(archiveInfo)}</td>`
    descEl = yo`<td>${niceDesc(archiveInfo)}</td>`
  }

  return yo`
    <div class="archive-info">
      <div class="archive-info-header">
        <h2>${archiveInfo.title || 'Untitled'}</h2>

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

      <p class="archive-info-desc">${archiveInfo.description || yo`<em>No description</em>`}</p>

      <div class="archive-info-metadata">
        <table>
          <tr><td class="label">Title</td>${titleEl}</tr>
          <tr><td class="label">Description</td>${descEl}</tr>
          <tr><td class="label">Size</td><td>${prettyBytes(archiveInfo.size)}</td></tr>
          <tr><td class="label">Updated</td><td>${niceDate(archiveInfo.mtime || 0)}</td></tr>
          <tr><td class="label">Editable</td><td>${archiveInfo.isOwner}</td></tr>
        </table>

        ${archiveInfo.isOwner && isEditingInfo
          ? yo`<button onclick=${onSaveSettings} class="save btn">Save</button>`
          : ''
        }
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

function onImportFiles () {
  // TODO
}

function onFork () {
  // TODO
}

function onToggleSaved () {
  // TODOyou 
}

// helpers
// =

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}
import * as yo from 'yo-yo'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'

// exported api
// =

export default function render (node) {
  const isEditingInfo = false // TODO
  const archiveInfo = node._archiveInfo
  if (!archiveInfo) return yo`<div></div>`

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

// helpers
// =

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}
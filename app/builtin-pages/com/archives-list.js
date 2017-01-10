import * as yo from 'yo-yo'
import { shortenHash } from '../../lib/strings'
import { pushUrl } from '../../lib/fg/event-handlers'
import { createArchiveFlow } from '../com/modals/edit-site'

// exported api
// =

export function render (archivesList, { selectedArchiveKey } = {}) {
  // render archives
  var archiveEls = archivesList.archives.map((archive, index) => {
    let title = archive.title || shortenHash(archive.key)
    let activeCls = (archive.key === selectedArchiveKey) ? 'active' : ''
    return yo`<div class="ll-row ${activeCls}">
      <a class="ll-link" href=${'beaker:archive/'+archive.key} onclick=${pushUrl} title=${title}>
        <span class="ll-title">${title}</span>
      </a>
    </div>`
  })

  // if empty
  if (archiveEls.length == 0) {
    archiveEls.push(renderEmpty())
  }

  // render all
  return yo`<div class="links-list archives-list">
    <div class="flex">
      <input type="text" placeholder="Filter">
      <button class="btn btn-green" onclick=${createArchiveFlow}>New</button>
    </div>
    ${archiveEls}
  </div>`
}

function renderEmpty () {
  return yo`<div class="archives-list-empty">
    You dont have any archives yet.
  </div>`
}
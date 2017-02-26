import * as yo from 'yo-yo'
import { pushUrl } from '../../lib/fg/event-handlers'
import { createArchiveFlow } from '../com/modals/edit-site'

// exported api
// =

export function render (archivesList, { selectedArchiveKey, currentFilter, onChangeFilter } = {}) {
  // render archives
  var archiveEls = archivesList.archives.map((archive, index) => {
    // apply filtering
    if (!archive.userSettings.isSaved) return
    if (currentFilter && archive.title.toLowerCase().indexOf(currentFilter) === -1) return ''

    // render
    let title = archive.title || 'Untitled'
    let activeCls = (archive.key === selectedArchiveKey) ? 'active' : ''
    let iconCls = (archive.key === selectedArchiveKey) ? 'fa-folder-open-o' : 'fa-folder-o'

    return yo`
      <li class="archives-item ${activeCls}">
        <a href=${'beaker:library/'+archive.key} onclick=${pushUrl} title=${title}>
          <i class="fa ${iconCls}"></i>
          ${title}
        </a>
      </li>`
  })

  // if empty
  if (archiveEls.length == 0) {
    archiveEls.push(renderEmpty())
  }

  // render all
  return yo`<div class="links-list archives-list">
    <div class="flex">
      <input type="text" placeholder="Filter" onkeyup=${onChangeFilter} value=${currentFilter||''} />
      <button class="btn btn-green" onclick=${createArchiveFlow}>New</button>
    </div>
    <div><strong>Websites</strong></div>
    ${archiveEls}
  </div>`
}

function renderEmpty () {
  return yo`<div class="archives-list-empty">
    You dont have any sites saved yet.
  </div>`
}
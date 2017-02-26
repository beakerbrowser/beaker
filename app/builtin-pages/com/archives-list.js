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
        <a data-href=${'beaker:library/'+archive.key} onclick=${pushUrl} title=${title}>
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
  return yo`
    <div class="archives-sidebar">
      <div class="archives-sidebar-tools">
        <input type="text" placeholder="Search" onkeyup=${onChangeFilter} value=${currentFilter||''} class="search"/>
        <button onclick=${createArchiveFlow} class="new" aria-label="Create new archive">
          <i class="fa fa-plus"></i>
        </button>
      </div>

      <ul class="archives-list">
       ${archiveEls}
     </ul>
    </div>`
}

// TODO: put the magic wand icon next to this link. -tbv
function renderEmpty () {
  return yo`
    <div class="archives-list empty">
      <p>
        You don't have any sites in your library. Get started by <a onclick=${createArchiveFlow}>creating your own site.</a>
      </p>
    </div>`
}

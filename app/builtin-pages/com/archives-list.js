import * as yo from 'yo-yo'
import { pushUrl } from '../../lib/fg/event-handlers'

// exported api
// =

export function render (archivesList, { selectedArchiveKey, currentFilter, onChangeFilter } = {}) {
  // render all
  return yo`
    <div class="archives-sidebar">
      <div class="archives-sidebar-tools">
        <input type="text" placeholder="Search" onkeyup=${onChangeFilter} value=${currentFilter||''} class="search"/>
        <button onclick=${createArchive} class="new" aria-label="Create new archive">
          <i class="fa fa-plus"></i>
        </button>
      </div>

      <ul class="archives-list">
        ${renderArchivesListItems(archivesList, {selectedArchiveKey, currentFilter})}
      </ul>
    </div>`
}

export function renderArchivesListItems (archivesList, {selectedArchiveKey, currentFilter}) {
  // render archives
  var archiveEls = archivesList.archives.map((archive, index) => {
    // apply filtering
    if (!archive.userSettings.isSaved) return
    if (currentFilter && archive.title.toLowerCase().indexOf(currentFilter) === -1) return ''

    // render
    let title = archive.title || 'Untitled'
    let activeCls = (archive.key === selectedArchiveKey) ? 'active' : ''
    let iconCls = (archive.key === selectedArchiveKey) ? 'fa-folder-open' : 'fa-folder-o'

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

  return archiveEls
}

// TODO: put the magic wand icon next to this link. -tbv
function renderEmpty () {
  return yo`
    <div class="archives-list empty">
      <em>No sites</em>
      <p>
        <a onclick=${createArchive}>Create a new site.<i class="fa fa-magic"></i></a>
      </p>
    </div>`
}

async function createArchive () {
  var archive = await DatArchive.create()
  window.history.pushState(null, '', viewUrl(archive.url))
}

function viewUrl (url) {
  return 'beaker:library/' + url.slice('dat://'.length)
}
/* globals beaker */

import yo from 'yo-yo'
import toggleable, {closeAllToggleables} from '../toggleable'

// globals
// =

var loadedArchivesList
var loadPromise

// exported api
// =

export default function render (current, opts) {
  if (opts.archiveOptions || loadedArchivesList) {
    return renderLoaded(current, opts)
  }
  return renderLoading(current, opts)
}

// rendering
// =

function renderLoading (current, opts) {
  var el = toggleable(yo`
    <div class="dropdown toggleable-container archive-select-btn" data-toggle-id=${opts.toggleId || ''}>
      <button class="btn toggleable">
        ... <i class="fa fa-caret-down"></i>
      </button>
    </div>`
  )

  // load archives and re-render
  if (!loadPromise) {
    loadPromise = beaker.archives.list({isSaved: true, isOwner: true})
  }
  loadPromise.then(res => {
    loadedArchivesList = res
    loadedArchivesList.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    yo.update(el, renderLoaded(current, opts))
  }, console.error)

  return el
}

function renderLoaded (current, {archiveOptions, onSelect, toggleId} = {}) {
  if (!archiveOptions) archiveOptions = loadedArchivesList
  var icon = current ? yo`<img class="favicon" src="beaker-favicon:${current.url}" />` : ''
  var label = current ? current.info.title : 'Select archive'

  function onClickArchive (a) {
    closeAllToggleables()
    onSelect(a.url)
  }

  function onSubmitUrl (e) {
    e.preventDefault()
    var url = e.target.url.value

    if (url) {
      closeAllToggleables()
      onSelect(url)
    }
  }

  return toggleable(yo`
    <div class="dropdown toggleable-container archive-select-btn" data-toggle-id=${toggleId || ''}>
      <button class="btn toggleable">
        ${icon}${label} <i class="fa fa-caret-down"></i>
      </button>

      <div class="dropdown-items subtle-shadow left">
        <form onsubmit=${onSubmitUrl}>
          <input name="url" placeholder="Archive URL (dat://...)" />
        </form>
        <div class="scroll">
          ${archiveOptions.map(a => yo`
            <div class="dropdown-item" onclick=${e => onClickArchive(a)}>
              <img class="favicon" src="beaker-favicon:${a.url}" />
              <span class="title">${a.title || yo`<em>Untitled</em>`}</span>
              <span class="url">${a.key.slice(0, 6)}</span>
            </div>`
          )}
        </div>
      </div>
    </div>`
  )
}
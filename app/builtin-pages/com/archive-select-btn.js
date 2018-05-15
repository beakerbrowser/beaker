import yo from 'yo-yo'
import toggleable, {closeAllToggleables} from './toggleable'

// globals
// =

var archivesList
var loadPromise

// exported api
// =

export default function render (current, opts) {
  if (archivesList) {
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
    archivesList = res
    archivesList.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    yo.update(el, renderLoaded(current, opts))
  }, console.error)

  return el
}

function renderLoaded (current, {onSelect, toggleId} = {}) {
  var currentArchive = current ? archivesList.find(a => a.url === current.url) : null
  var icon = currentArchive ? yo`<img class="favicon" src="beaker-favicon:${current.url}" />` : ''
  var label = currentArchive ? currentArchive.title : 'Select archive'
  function onClickArchive (a) {
    closeAllToggleables()
    onSelect(a.url)
  }
  return toggleable(yo`
    <div class="dropdown toggleable-container archive-select-btn" data-toggle-id=${toggleId || ''}>
      <button class="btn toggleable">
        ${icon}${label} <i class="fa fa-caret-down"></i>
      </button>

      <div class="dropdown-items subtle-shadow left">
        ${archivesList.map(a => yo`
          <div class="dropdown-item" onclick=${e => onClickArchive(a)}>
            <img class="favicon" src="beaker-favicon:${a.url}" /> ${a.title}
          </div>`
        )}
      </div>
    </div>`
  )
}
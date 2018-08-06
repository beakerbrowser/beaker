/* globals DatArchive */

import * as yo from 'yo-yo'

const FETCH_COUNT = 200

// exported api
// =

var counter = 0
var history
export default function render (archive) {
  var el = yo`
    <div class="archive-history loading">
      <div class="archive-history-body">
        ${history ? history.map(renderRow) : 'Loading history...'}
        ${(!history || history[history.length - 1].version === 1)
          ? ''
          : yo`
            <div class="archive-history-item" onclick=${fetchMore}>
              <button class="link">Load more</button>
            </div>`}
      </div>
    </div>
  `
  el.isSameNode = (other) => (other && other.classList && other.classList.contains('archive-history'))

  // lazy-load history
  if (archive && !history) {
    // read from latest
    archive = archive.checkout()
    history = []
    fetchMore()
  }

  return el

  function renderRow (c) {
    return yo`
      <div
        onclick=${() => window.location = `beaker://library/${archive.url}+${c.version}`}
        class="archive-history-item"
        title="View version ${c.version}"
        href="beaker://library/${archive.url}+${c.version}"
      >
        ${c.type === 'put' ? 'Updated' : 'Deleted'}

        <div class="path">
          <a href="${archive.url}+${c.version}${c.path}" target="_blank">
            ${c.path.slice(1)}
          </a>
        </div>

        <div class="version badge green">v${c.version}</div>
      </div>`
  }
  
  async function fetchMore () {
    try {
      // fetch
      let start = history.length
      let h = await archive.history({start, end: start + FETCH_COUNT, reverse: true})
      history = history.concat(h)

      // render
      var rowEls = history.map(renderRow)

      yo.update(el, yo`
        <div class="archive-history">
          <div class="archive-history-body">
            ${rowEls}
            ${(history[history.length - 1].version === 1)
              ? ''
              : yo`
                <div class="archive-history-item" onclick=${fetchMore}>
                  <button class="link">Load more</button>
                </div>`}
          </div>
        </div>`
      )
    } catch (err) {
      console.error('Error loading history', err)
      yo.update(el, yo`
        <div class="archive-history">
          <div class="archive-history-header">Change history</div>
          <div class="archive-history-body error">
            <i class="fa fa-frown-o"></i>
            ${err.toString()}
          </div>
        </div>`
      )
    }
  }
}

/* globals DatArchive */

import * as yo from 'yo-yo'

const FETCH_COUNT = 200

// exported api
// =

var counter = 0
var history
var baseUrl
export default function render (archive, {filePath, includePreview, syncPath} = {}) {
  filePath = filePath || ''
  var el = renderHistory()
  //el.isSameNode = (other) => (other && other.classList && other.classList.contains('archive-history'))

  // lazy-load history
  if (archive && !history) {
    // read from latest
    archive = archive.checkout()
    baseUrl = archive.url
    history = []
    fetchMore()
  }

  return el

  function onGoto (e) {
    window.location = e.currentTarget.getAttribute('href')
  }

  function renderHistory () {
    return yo`
      <div class="archive-history ${history ? '' : 'loading'}">
        <div class="archive-history-body">
          <div onclick=${onGoto} class="archive-history-item ${includePreview ? '' : 'no-border'}" title="View latest published" href="beaker://library/${baseUrl}+latest${filePath}">
            <span class="fa fa-fw fa-globe"></span>
            View latest published
          </div>
          ${includePreview
            ? yo`
              <div onclick=${onGoto} class="archive-history-item no-border" title="View local preview" href="beaker://library/${baseUrl}+preview${filePath}">
                <span class="fa fa-fw fa-laptop"></span>
                ${syncPath
                  ? yo`
                    <span>
                      View preview <span class="sync-path">(${syncPath}</span>)
                    </span>`
                  : 'View local preview'
                }
              </div>`
            : ''}
          <hr />
          ${history ? history.map(renderRow) : 'Loading...'}
          ${(!history || history[history.length - 1].version === 1)
            ? ''
            : yo`
              <div class="archive-history-item" onclick=${fetchMore}>
                <button class="link">Load more</button>
              </div>`
           }
        </div>
      </div>`
  }

  function renderRow (c) {
    return yo`
      <div
        onclick=${onGoto}
        class="archive-history-item"
        title="View version ${c.version}"
        href="beaker://library/${baseUrl}+${c.version}${filePath}"
      >
        ${c.type === 'put' ? 'Updated' : 'Deleted'}

        <div class="path">
          <a href="${baseUrl}+${c.version}${c.path}" target="_blank">
            ${c.path.slice(1)}
          </a>
        </div>

        <div class="version badge">v${c.version}</div>
      </div>`
  }

  async function fetchMore () {
    try {
      // fetch
      let start = history.length
      let h = await archive.history({start, end: start + FETCH_COUNT, reverse: true})
      history = history.concat(h)

      // render
      yo.update(el, renderHistory())
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

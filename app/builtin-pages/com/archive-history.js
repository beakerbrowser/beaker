import * as yo from 'yo-yo'

// exported api
// =

export default function render (archive) {
  var el = yo`<div class="archive-history loading">
    <div class="archive-history-header">Version history</div>
    <div class="archive-history-body">Loading...</div>
  </div>`

  // lazy-load history
  if (archive) {
    // strip the version
    let vi = archive.url.indexOf('+')
    if (vi !== -1) {
      archive = new DatArchive(archive.url.slice(0, vi))
    }

    archive.history()
      .then(history => {
        // render
        var rowEls = history.reverse().map(c => {
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
        })

        yo.update(el, yo`
          <div class="archive-history">
            <div class="archive-history-header">Version history</div>
            <div class="archive-history-body">${rowEls}</div>
          </div>`
        )
      })
      .catch(err => {
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
    )
  }

  return el
}
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
    archive.history()
      .then(history => {
        // render
        var rowEls = history.reverse().map(c => {
          return yo`
            <div onclick=${() => window.history.pushState('', {}, `beaker://library/${archive.url}+${c.version}`)} class="archive-history-item" title="View version ${c.version}" href="beaker://library/${archive.url}+${c.version}">
              ${c.type === 'put' ? 'Updated' : 'Deleted'}

              <div class="path">
                <a href="${archive.url}+${c.version}${c.path}" target="_blank">
                  ${c.path.slice(1)}
                </a>
              </div>

              <code class="version badge green">v${c.version}</code>
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
            <div class="archive-history-body">${err.toString()}</div>
          </div>`
        )
      }
    )
  }

  return el
}
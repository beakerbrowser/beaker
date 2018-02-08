import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'

// exported api
// =

export default function render (archive) {
  var el = yo`<div class="archive-history loading">Loading...</div>`

  // lazy-load history
  if (archive) {
    archive.history()
      .then(history => {
        // render
        var rowEls = history.map(c => {
          return yo`
            <div class="archive-history-item">
              <a href="${archive.url}+${c.version}${c.path}" title=${c.path} target="_blank"><span>${c.version}</span><i class="fa fa-${c.type === 'put' ? 'plus' : 'minus'}-square"></i><span>${c.path}</span></a>
            </div>`
        })
        yo.update(el, yo`<div class="archive-history">${rowEls}</div>`)
      })
      .catch(err => {
        console.error('Error loading history', err)
        yo.update(el, yo`<div class="archive-history">${err.toString()}</div>`)
      }
    )
  }

  return el
}


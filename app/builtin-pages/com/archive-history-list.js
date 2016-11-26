import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'

export function archiveHistoryList (changes) {
  var rowEls = []

  changes.forEach(c => {
    var row
    switch (c.type) {
      case 'index':
        row = yo`<div class="ll-row archive-history">
          <a class="ll-link" title=${c.name}>
            <span class="favicon icon icon-code"></span>
            <span class="ll-title">content -- ${c.content.toString('hex')}</span>
          </a>
        </div>`
        break
      case 'file':
        row = yo`<div class="ll-row archive-history">
          <a class="ll-link" title=${c.name}>
            <span class="favicon icon icon-doc-text"></span>
            <span class="ll-title">${c.name}</span>
          </a>
          <div class="ll-status">${c.blocks} block(s)</div>
          <div class="ll-progress">${prettyBytes(c.length)}</div>
        </div>`
        break
      case 'directory':
        row = yo`<div class="ll-row archive-history">
          <a class="ll-link" title=${c.name}>
            <span class="favicon icon icon-folder"></span>
            <span class="ll-title">${c.name || '(empty)'}</span>
          </a>
        </div>`
        break
    }
    rowEls.push(row)
  })

  return rowEls
}

export function archiveHistoryMeta (history) {
  return yo`<div class="meta">
    <div><span class="icon icon-plus-squared"></span>${history.blocks} changes</div>
    <div><span class="icon icon-database"></span>Total Content Size: ${prettyBytes(history.size)} (${prettyBytes(history.metaSize)} metadata)</span></div>
  </div>`
}

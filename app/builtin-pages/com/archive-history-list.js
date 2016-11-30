import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'

export function archiveHistoryList (info) {
  var rowEls = [yo`<div class="ll-row archive-history">
          <a class="ll-link" title=${info.contentKey.toString('hex')}>
            <span class="favicon icon icon-code"></span>
            <span class="ll-title">content -- ${info.contentKey.toString('hex')}</span>
          </a>
        </div>`]

  info.entries.forEach(c => {
    var row
    switch (c.type) {
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

export function archiveHistoryMeta (info) {
  return yo`<div class="meta">
    <div><span class="icon icon-plus-squared"></span>${info.blocks} changes</div>
    <div><span class="icon icon-database"></span>Total Content Size: ${prettyBytes(info.size)} (${prettyBytes(info.metaSize)} metadata)</span></div>
  </div>`
}

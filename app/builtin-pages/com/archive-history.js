import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import { niceDate } from '../../lib/time'

export function archiveHistory ({ info }) {
  var rowEls = []

  info.entries.forEach(c => {
    var row
    var mtime = c.mtime ? niceDate(c.mtime) : ''
    switch (c.type) {
      case 'file':
        row = yo`<div class="ll-row">
          <span class="ll-link" title=${c.name}>
            <span class="favicon icon icon-plus-squared"></span>
            <span class="ll-title">/${c.path}</span>
          </span>
          <span class="ll-updated" title=${mtime}>${mtime}</span>
          <span class="ll-progress">${prettyBytes(c.length||0)}</span>
        </div>`
        break
      case 'directory':
        row = yo`<div class="ll-row">
          <span class="ll-link" title=${c.name}>
            <span class="favicon icon icon-plus-squared"></span>
            <span class="ll-title">/${c.path || ''}</span>
          </span>
          <span class="ll-updated" title=${mtime}>${mtime}</span>
          <span class="ll-progress"></span>
        </div>`
        break
    }
    rowEls.push(row)
  })

  return yo`<div class="archive-history">
    <div class="links-list">${rowEls}</div>
  </div>`
}
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
        row = yo`
          <li class="history-item">
            <i class="favicon fa fa-plus-square"></i>
            <span class="title">/${c.path}</span>
            <span class="updated" title=${mtime}>${mtime}</span>
            <span class="progress">${prettyBytes(c.length||0)}</span>
          </li>`
        break
      case 'directory':
        row = yo`
          <li class="history-item">
            <i class="fa fa-plus-square"></i>
            <span class="title">/${c.path || ''}</span>
            <span class="updated" title=${mtime}>${mtime}</span>
            <span class="progress"></span>
          </li>`
        break
    }
    rowEls.push(row)
  })

  return yo`
    <ul class="archive-history">
      ${rowEls}
    </ul>`
}

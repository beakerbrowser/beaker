import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {pluralize} from '../../lib/strings'

export function archiveHistory ({ info }) {
  var rowEls = []

  info.entries.forEach(c => {
    var row
    switch (c.type) {
      case 'file':
        row = yo`<div class="ll-row">
          <span class="ll-link" title=${c.name}>
            <span class="favicon icon icon-plus-squared"></span>
            <span class="ll-title">/${c.path}</span>
          </span>
          <div class="ll-status">${c.blocks} ${pluralize(c.blocks, 'block')}</div>
          <div class="ll-progress">${prettyBytes(c.length||0)}</div>
        </div>`
        break
      case 'directory':
        row = yo`<div class="ll-row">
          <span class="ll-link" title=${c.name}>
            <span class="favicon icon icon-plus-squared"></span>
            <span class="ll-title">/${c.path || ''}</span>
          </span>
        </div>`
        break
    }
    rowEls.push(row)
  })

  return yo`<div class="archive-history">
    <div class="links-list">${rowEls}</div>
  </div>`
}

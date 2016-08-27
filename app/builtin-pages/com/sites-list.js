import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'

export function render (sites, opts={}) {
  // render sites
  var siteEls = []
  sites.forEach((site, index) => {

    // render row
    let title = site.name||'Untitled'
    let mtime = site.mtime ? ucfirst(niceDate(site.mtime)) : '--'
    let url = 'view-dat://'+site.key
    siteEls.push(yo`<a class="ll-row site" href=${url} title=${title}>
      <div class="ll-link">
        <img class="favicon" src=${'beaker-favicon:dat://'+site.key} />
        <span class="ll-title">${title}</span>
      </div>
      <div class="ll-updated" title=${mtime}>${mtime}</div>
      <div class="ll-size">${site.size ? prettyBytes(site.size) : '0 B'}</div>
      <div class="ll-status">${site.peers+' '+pluralize(site.peers, 'peer')}</div>
    </div>`)
  })

  // if empty
  if (opts.renderEmpty && siteEls.length == 0)
    siteEls.push(opts.renderEmpty())

  // render all
  return yo`<div class="links-list">
    ${siteEls}
  </div>`
}
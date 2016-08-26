import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'

export function render (sites, opts={}) {

  var head = ''
  if (opts.showHead) {
    head = yo`<div class="sl-head">
      <div class="sl-name">Name</div>
      <div class="sl-updated">Last Updated</div>
      <div class="sl-size">Size</div>
      <div class="sl-status">Status</div>
      <div class="sl-actions"></div>
    </div>`
  }

  // render sites
  var siteEls = []
  sites.forEach((site, index) => {
    // is the selected site?
    var isSelected = index === opts.selectedIndex

    // status column
    var status = '', peers = ''
    if (site.isDownloading)
      status = 'Downloading'
    else if (site.isSharing) {
      status = 'Sharing'
      peers = site.peers+' '+pluralize(site.peers, 'peer')
    }

    // render row
    let title = site.name||'Untitled'
    let mtime = site.mtime ? ucfirst(niceDate(site.mtime)) : '--'
    var onclick = opts.onToggleNodeExpanded ? (e => opts.onToggleNodeExpanded(site)) : undefined
    var onToggleSharing = opts.onToggleSharing ? (e => opts.onToggleSharing(site)) : undefined
    siteEls.push(yo`<div class=${"sl-row site"+(isSelected?' selected':'')} onclick=${onclick}>
      <div class="sl-name">
        <div>
          <strong><a href=${'beaker:site/'+site.key} onclick=${onClickSite} title=${title}>${title}</a></strong>
        </div>
        ${site.description ? yo`<div>${site.description}</div>` : ''}
      </div>
      <div class="sl-updated" title=${mtime}>${mtime}</div>
      <div class="sl-size">${site.size ? prettyBytes(site.size) : '0 B'}</div>
      <div class="sl-status">
        <div>
          ${ site.isSharing
            ? yo`<span class="label-btn"><span>${status}</span><a onclick=${onToggleSharing} title="Stop sharing"><span class="icon icon-cancel"></a></span>`
            : yo`<a onclick=${onToggleSharing}>Start sharing</a>` }
        </div>
        <div><small>${peers}</small></div>
      </div>
    </div>`)
  })

  // if empty
  if (opts.renderEmpty && siteEls.length == 0)
    siteEls.push(opts.renderEmpty())

  // render all
  return yo`<div class="sites-list">
    ${head}
    <div class="sl-rows">
      ${siteEls}
    </div>
  </div>`
}


function onClickSite (e) {
  if (window.location.protocol == 'beaker:') {
    // just navigate virtually
    e.preventDefault()
    window.history.pushState(null, '', e.target.href)
  }
}
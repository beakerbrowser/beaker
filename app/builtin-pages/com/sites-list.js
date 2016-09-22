import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'

export function render (sites, opts={}) {
  // render sites
  var numDeleted = 0
  var siteEls = []
  sites.forEach((site, index) => {
    // if not saved but in this listing, then it was recently deleted
    if (!site.userSettings.isSaved) {
      return numDeleted++
    }

    // render row
    let title = site.title||'Untitled'
    let mtime = site.mtime ? ucfirst(niceDate(site.mtime)) : '--'
    let url = 'view-dat://'+site.key
    let serveToggleLabel = site.userSettings.isServing
      ? yo`<div><span class="icon icon-cancel"></span> Stop Serving</div>`
      : yo`<div><span class="icon icon-share"></span> Serve</div>`
    siteEls.push(yo`<div class="ll-row site">
      <div class="ll-link">
        <img class="favicon" src=${'beaker-favicon:dat://'+site.key} />
        <a class="ll-title" href=${url} title=${title}>
          ${title}
        </a>
      </div>
      <div class="ll-updated" title=${mtime}>${mtime}</div>
      <div class="ll-symbol">${site.isOwner ? yo`<span class="icon icon-pencil" title="You are the site author"></span>` : '' }</div>
      <div class="ll-size">${site.size ? prettyBytes(site.size) : '0 B'}</div>
      <div class="ll-symbol">${site.userSettings.isServing ? yo`<span class="icon icon-share" title="Serving"></span>` : '' }</div>
      <div class="ll-status">${site.peers+' '+pluralize(site.peers, 'peer')}</div>
      <div class="ll-dropdown">${toggleable(yo`
        <div class="dropdown-btn-container">
          <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
          <div class="dropdown-btn-list">
            <div onclick=${opts.onToggleServeSite(site)}>${serveToggleLabel}</div>
            <div onclick=${opts.onDeleteSite(site)}><span class="icon icon-trash"></span> Delete</div>
          </div>
        </div>
      `)}</div>
    </div>`)
  })

  // if empty
  if (opts.renderEmpty && siteEls.length == 0)
    siteEls.push(opts.renderEmpty())

  // give option to undo deletes
  if (numDeleted) {
    siteEls.unshift(yo`<div class="ll-notice">${numDeleted} ${pluralize(numDeleted, 'site')} deleted. <a onclick=${opts.onUndoDeletions}>undo</a></div>`)
  }

  // render all
  return yo`<div class="links-list">
    ${siteEls}
  </div>`
}
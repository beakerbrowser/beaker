import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable, { closeToggleable } from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'

export function render (archives, opts={}) {
  // render archives
  var numDeleted = 0
  var archiveEls = []
  archives.forEach((archive, index) => {
    // if not saved but in this listing, then it was recently deleted
    if (!archive.userSettings.isSaved) {
      return numDeleted++
    }

    // render row
    let title = archive.title||'Untitled'
    let mtime = archive.mtime ? ucfirst(niceDate(archive.mtime)) : '--'
    let serveToggleLabel = archive.userSettings.isServing
      ? yo`<div><span class="icon icon-publish"></span> Stop Serving</div>`
      : yo`<div><span class="icon icon-publish"></span> Serve</div>`
    archiveEls.push(yo`<div class="ll-row archive">
      <div class="ll-link">
        <img class="favicon" src=${'beaker-favicon:dat://'+archive.key} />
        <a class="ll-title" href=${'dat://'+archive.key} title=${title}>
          ${title}
        </a>
      </div>
      <div class="ll-updated" title=${mtime}>${mtime}</div>
      <div class="ll-symbol">${archive.isOwner ? yo`<span class="icon icon-pencil" title="You are the archive author"></span>` : '' }</div>
      <div class="ll-size">${archive.size ? prettyBytes(archive.size) : '0 B'}</div>
      <div class="ll-status">${archive.peers+' '+pluralize(archive.peers, 'peer')}</div>
      <div class="ll-serve">${archive.userSettings.isServing 
        ? yo`<a class="btn btn-primary glowing" onclick=${opts.onToggleServeArchive(archive)} title="Sharing"><span class="icon icon-share"></span> Sharing</a>` 
        : yo`<a class="btn" onclick=${opts.onToggleServeArchive(archive)} title="Share"><span class="icon icon-share"></span> Share</a>` }</div>
      <div class="ll-dropdown">${toggleable(yo`
        <div class="dropdown-btn-container">
          <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
          <div class="dropdown-btn-list">
            <a href=${'view-dat://'+archive.key}><span class="icon icon-docs"></span> View Files</a>
            <div onclick=${onCopyLink(archive.key)}><span class="icon icon-link"></span> Copy Link</div>
            <hr>
            <div onclick=${opts.onDeleteArchive(archive)}><span class="icon icon-trash"></span> Delete</div>
          </div>
        </div>
      `)}</div>
    </div>`)
  })

  // if empty
  if (opts.renderEmpty && archiveEls.length == 0)
    archiveEls.push(opts.renderEmpty())

  // give option to undo deletes
  if (numDeleted) {
    archiveEls.unshift(yo`<div class="ll-notice">${numDeleted} ${pluralize(numDeleted, 'archive')} deleted. <a onclick=${opts.onUndoDeletions}>undo</a></div>`)
  }

  // render all
  return yo`<div class="links-list">
    ${archiveEls}
  </div>`
}

function onCopyLink (key) {
  return e => {
    var textarea = yo`<textarea>${'dat://'+key}</textarea>`
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    closeToggleable(e.target)
  }
}
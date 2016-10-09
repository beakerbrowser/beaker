import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable, { closeToggleable } from './toggleable'
import { pluralize } from '../../lib/strings'
import { pushUrl, writeToClipboard } from '../../lib/fg/event-handlers'

export function render (archives, opts={}) {
  // render archives
  var numDeleted = 0
  var archiveEls = []
  archives.forEach((archive, index) => {
    // if not saved but in this listing, then it was recently deleted
    if (!archive.userSettings.isSaved) {
      return numDeleted++
    }

    // render stats
    var progress, status, blocksProgress = 0, blocksTotal = 1
    if (archive.stats) {
      blocksProgress = archive.stats.blocksProgress
      blocksTotal = archive.stats.blocksTotal
      if (blocksProgress !== blocksTotal) {
        // not yet downloaded
        progress = `${prettyBytes(blocksProgress)} / ${prettyBytes(blocksTotal)}`
        status = 'Downloading' // TODO show speed
      } else {
        // fully downloaded
        progress = prettyBytes(blocksTotal)
        if (archive.userSettings.isServing) {
          status = 'Seeding'
        } else {
          status = 'Idle'
        }
      }
    }

    // render row
    let title = archive.title || archive.key
    archiveEls.push(yo`<div class="ll-row archive">
      <div class="ll-link">
        <img class="favicon" src=${'beaker-favicon:dat://'+archive.key} />
        <a class="ll-title" href=${'beaker:archive/'+archive.key} onclick=${pushUrl} title=${title}>${title}</a>
      </div>
      <div class="ll-status">${status}</div>
      <div class="ll-progress">${progress}</div>
      <div class="ll-progressbar"><progress value=${blocksProgress} max=${blocksTotal}></progress></div>
      <div class="ll-serve">${archive.userSettings.isServing 
        ? yo`<a class="btn btn-primary glowing" onclick=${opts.onToggleServeArchive(archive)} title="Syncing"><span class="icon icon-down-circled"></span> Syncing</a>` 
        : yo`<a class="btn" onclick=${opts.onToggleServeArchive(archive)} title="Sync"><span class="icon icon-down-circled"></span> Sync</a>` }</div>
      <div class="ll-dropdown">${toggleable(yo`
        <div class="dropdown-btn-container" data-toggle-id=${`archive-${archive.key}`}>
          <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
          <div class="dropdown-btn-list">
            <a href=${'beaker:archive/'+archive.key} onclick=${pushUrl}><span class="icon icon-docs"></span> View Files</a>
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
    writeToClipboard('dat://'+key)
    closeToggleable(e.target)
  }
}

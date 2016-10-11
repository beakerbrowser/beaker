import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'
import { pushUrl, writeToClipboard } from '../../lib/fg/event-handlers'

// exported api
// =

export function render (archivesList, opts = {}) {
  const rerender = opts.render || (() => {})

  // render archives
  var numDeleted = 0
  var archiveEls = []
  archivesList.archives.forEach((archive, index) => {
    // if not saved but in this listing, then it was recently deleted
    if (!archive.userSettings.isSaved) {
      return numDeleted++
    }
    let title = archive.title || archive.key

    if (archive.isOwner) {
      // render owned archive
      let mtime = archive.mtime ? ucfirst(niceDate(archive.mtime)) : '--'
      archiveEls.push(yo`<div class="ll-row archive">
        <div class="ll-link">
          <img class="favicon" src=${'beaker-favicon:dat://'+archive.key} />
          <a class="ll-title" href=${'beaker:archive/'+archive.key} onclick=${pushUrl} title=${title}>
            ${title}
          </a>
        </div>
        <div class="ll-status">${archive.userSettings.isServing ? (archive.peers + ' ' + pluralize(archive.peers, 'peer')) : ''}</div>
        <div class="ll-updated" title=${mtime}>${mtime}</div>
        <div class="ll-size">${archive.size ? prettyBytes(archive.size) : '0 B'}</div>
        <div class="ll-serve">${archive.userSettings.isServing 
          ? yo`<a class="btn btn-primary glowing" onclick=${onToggleServeArchive(archive, rerender)} title="Sharing"><span class="icon icon-share"></span> Sharing</a>` 
          : yo`<a class="btn" onclick=${onToggleServeArchive(archive, rerender)} title="Share"><span class="icon icon-share"></span> Share</a>` }</div>
        <div class="ll-dropdown">${toggleable(yo`
          <div class="dropdown-btn-container">
            <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
            <div class="dropdown-btn-list">
              <a href=${'beaker:archive/'+archive.key} onclick=${pushUrl}><span class="icon icon-docs"></span> View Files</a>
              <div onclick=${onCopyLink(archive.key)}><span class="icon icon-link"></span> Copy Link</div>
              <hr>
              <div onclick=${onDeleteArchive(archive, rerender)}><span class="icon icon-trash"></span> Delete</div>
            </div>
          </div>
        `)}</div>
      </div>`)
    } else {
      // download stats
      let progress
      let status
      let blocksProgress = 0
      let blocksTotal = 1
      if (archive.stats) {
        blocksProgress = archive.stats.blocksProgress
        blocksTotal = archive.stats.blocksTotal
        if (blocksProgress < blocksTotal) {
          // not yet downloaded
          // progress = `${prettyBytes(bytesProgress)} / ${prettyBytes(bytesTotal)}` TODO we dont have bytesProgress yet
          progress = prettyBytes(archive.stats.bytesTotal)
        } else {
          // fully downloaded
          progress = prettyBytes(archive.stats.bytesTotal)
        }
        if (archive.userSettings.isServing) {
          let speed = archive.stats.downloadSpeed()
          status = (speed > 0) ? (prettyBytes(speed) + '/s') : 'Seeding'
        } else {
          status = 'Idle'
        }
      }

      // render downloaded archive
      archiveEls.push(yo`<div class="ll-row archive">
        <div class="ll-link">
          <img class="favicon" src=${'beaker-favicon:dat://'+archive.key} />
          <a class="ll-title" href=${'beaker:archive/'+archive.key} onclick=${pushUrl} title=${title}>${title}</a>
        </div>
        <div class="ll-status">${status}</div>
        <div class="ll-progress">${progress}</div>
        <div class="ll-progressbar"><progress value=${blocksProgress} max=${blocksTotal}></progress></div>
        <div class="ll-serve">${archive.userSettings.isServing 
          ? yo`<a class="btn btn-primary glowing" onclick=${onToggleServeArchive(archive, rerender)} title="Syncing"><span class="icon icon-down-circled"></span> Syncing</a>` 
          : yo`<a class="btn" onclick=${onToggleServeArchive(archive, rerender)} title="Sync"><span class="icon icon-down-circled"></span> Sync</a>` }</div>
        <div class="ll-dropdown">${toggleable(yo`
          <div class="dropdown-btn-container" data-toggle-id=${`archive-${archive.key}`}>
            <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
            <div class="dropdown-btn-list">
              <a href=${'beaker:archive/'+archive.key} onclick=${pushUrl}><span class="icon icon-docs"></span> View Files</a>
              <div onclick=${onCopyLink(archive.key)}><span class="icon icon-link"></span> Copy Link</div>
              <hr>
              <div onclick=${onDeleteArchive(archive, rerender)}><span class="icon icon-trash"></span> Delete</div>
            </div>
          </div>
        `)}</div>
      </div>`)
    }
  })

  // if empty
  if (opts.renderEmpty && archiveEls.length == 0)
    archiveEls.push(opts.renderEmpty())

  // give option to undo deletes
  if (numDeleted) {
    archiveEls.unshift(yo`<div class="ll-notice">${numDeleted} ${pluralize(numDeleted, 'archive')} deleted. <a onclick=${onUndoDeletions(archivesList, rerender)}>undo</a></div>`)
  }

  // render all
  return yo`<div class="links-list">
    ${archiveEls}
  </div>`
}

function onCopyLink (key) {
  return e => writeToClipboard('dat://'+key)
}

function onToggleServeArchive (archiveInfo, render) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    archiveInfo.userSettings.isServing = !archiveInfo.userSettings.isServing

    // isSaved must reflect isServing
    if (archiveInfo.userSettings.isServing && !archiveInfo.userSettings.isSaved) {
      archiveInfo.userSettings.isSaved = true
    }
    datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)

    render()
  }
}

function onDeleteArchive (archiveInfo, render) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    archiveInfo.userSettings.isSaved = !archiveInfo.userSettings.isSaved

    // isServing must reflect isSaved
    if (!archiveInfo.userSettings.isSaved && archiveInfo.userSettings.isServing) {
      archiveInfo.userSettings.isServing = false
    }

    datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
    render()
  }
}

function onUndoDeletions (archivesList, render) {
  return (e) => {
    e.preventDefault()
    e.stopPropagation()

    archivesList.archives.forEach(archiveInfo => {
      if (!archiveInfo.userSettings.isSaved) {
        archiveInfo.userSettings.isSaved = true
        datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
      }
    })
    render()
  }
}
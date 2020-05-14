import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import { ucfirst, getHostname } from '../../../lib/strings'
import { downloadTimestamp } from '../../../lib/time'

// exported api
// =

export function render (downloadsList) {
  var downloadEls = downloadsList.downloads.map(d => {
    var metadataEl = ''
    var progressEl = ''

    if (d.state == 'progressing') {
      var status = (d.isPaused) ? 'Paused' : (prettyBytes(d.downloadSpeed || 0) + '/s')
      var controls = ''
      var cls = 'progressing'

      var cancelBtn = yo`
        <button data-tooltip="Cancel download" onclick=${() => downloadsList.cancelDownload(d)} class="btn small tooltip-container">
          <i title="Cancel download" class="fa fa-stop"></i>
        </button>`

      const progressPercentage = `${Math.floor((d.receivedBytes / d.totalBytes) * 100)}%`
      progressEl = yo`
        <div class="progress-ui blue small">
          <div style="width: ${progressPercentage}" class="completed"></div>
        </div>`

      if (d.isPaused) {
        controls = yo`
          <div class="btn-group buttons controls">
            ${cancelBtn}
            <button data-tooltip="Resume download" class="btn small tooltip-container" onclick=${() => downloadsList.resumeDownload(d)}>
              <i class="fa fa-play"></i>
            </button>
          </span>`
      } else {
        controls = yo`
          <div class="buttons controls btn-group">
            ${cancelBtn}
            <button data-tooltip="Pause download" class="btn small tooltip-container" onclick=${() => downloadsList.pauseDownload(d)}>
              <i class="fa fa-pause"></i>
            </button>
          </div>
        `
      }

      metadataEl = yo`
        <div class="metadata">
          ${prettyBytes(d.receivedBytes || 0)} / ${prettyBytes(d.totalBytes || 0)}
          (${status})
        </div>
      `
    } else if (d.state === 'completed') {
      // actions
      var actions
      if (!d.fileNotFound) {
        var removeBtn = yo`
          <button data-tooltip="Remove from downloads" onclick=${e => downloadsList.removeDownload(d)} class="btn plain trash tooltip-container">
            <i class="fa fa-times"></i>
          </button>
        `

        actions = [
          yo`
            <span class="link show" onclick=${e => { e.stopPropagation(); downloadsList.showDownload(d) }}>
              Show in folder
            </span>`
        ]
      } else {
        actions = [
          yo`<span>File not found (moved or deleted)</span>`
        ]
      }

      metadataEl = yo`
        <div class="metadata">
          <span>${prettyBytes(d.totalBytes || 0)}</span>
          —
          ${downloadTimestamp(d.id)}
          —
          ${actions}
        </div>
      `
    } else {
      metadataEl = yo`
        <div class="metadata">
          <span class="status">${ucfirst(d.state || '')}</span>
        </div>
      `
    }

    // render download
    return yo`
      <div class="ll-row download ${cls}" ondblclick=${(e) => downloadsList.openDownload(d)}>
        <span class="title">${d.name}</span>
        <span class="url">${getHostname(d.url)}</span>
        ${progressEl}
        ${controls}
        ${metadataEl}
        <div class="buttons controls">${removeBtn}</div>
      </div>`
  }).reverse()

  // empty state
  if (downloadEls.length === 0) {
    downloadEls =
      yo`
        <div class="view empty">
          <p>
            No downloads
          </p>
        </div>`
  }

  return yo`<div class="links-list">${downloadEls}</div>`
}

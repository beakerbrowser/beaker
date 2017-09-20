import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import { ucfirst } from '../../lib/strings'
import { downloadTimestamp } from '../../lib/time'
import { getHostname } from '../../lib/strings'
import renderCloseIcon from '../icon/close'

// exported api
// =

export function render (downloadsList) {
  var downloadEls = downloadsList.downloads.map(d => {
    var metadataEl = ''

    if (d.state == 'progressing') {
      var status = (d.isPaused) ? 'Paused' : (prettyBytes(d.downloadSpeed || 0) + '/s')
      var controls = ''

      var cancelBtn = yo`<i title="Cancel download" class="fa fa-stop" onclick=${e => downloadsList.cancelDownload(d)}></i>`

      if (d.isPaused) {
        controls = yo`
          <span class="controls">
            ${cancelBtn}
            <i title="Resume download" class="fa fa-play" onclick=${e => downloadsList.resumeDownload(d)}></i>
          </span>`
      } else {
        controls = yo`
          <span class="controls">
            ${cancelBtn}
            <i title="Pause download" class="fa fa-pause" onclick=${e => downloadsList.pauseDownload(d)}></i>
          </span>
        `
      }

      metadataEl = yo`
        <div class="metadata progress">
          <div class="progress">
            <div class="progressbar">
              <progress value=${d.receivedBytes} max=${d.totalBytes}></progress>
            </div>
          </div>

          <div>
            <span class="status">
              ${prettyBytes(d.receivedBytes || 0)} / ${prettyBytes(d.totalBytes || 0)}
              (${status})
            </span>
            ${controls}
          </div>
        </div>
      `
    } else if (d.state === 'completed') {
      // actions
      var actions
      if (!d.fileNotFound) {
        var removeBtn = yo`
          <span onclick=${e => downloadsList.removeDownload(d)} class="close-btn">
            ${renderCloseIcon()}
          </span>
        `

        actions = [
          yo`<span class="link show" onclick=${e => {e.stopPropagation(); downloadsList.showDownload(d)}}>Show in Finder</span>`,
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
          <span class="status">${ucfirst(d.state)}</span>
        </div>
      `
    }

    // render download
    return yo`
      <div class="ll-row download" ondblclick=${(e) => downloadsList.openDownload(d)}>
        ${removeBtn}

        <img class="favicon" src="beaker-favicon:"/>

        <div class="info">
          <h3>
            <span class="title">${d.name}</span>
            <span class="url">${getHostname(d.url)}</span>
          </h3>
          ${metadataEl}
        </div>
      </div>`
  }).reverse()

  // empty state
  if (downloadEls.length === 0) {
    downloadEls = yo`<em class="empty">No downloads</em>`
  }

  return yo`<div class="links-list">${downloadEls}</div>`
}

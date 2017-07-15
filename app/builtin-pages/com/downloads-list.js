import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import { ucfirst } from '../../lib/strings'

// exported api
// =

export function render (downloadsList) {
  var downloadEls = downloadsList.downloads.map(d => {
    var actions
    var status = ''
    var progress = ''
    var size = ''
    var canShow = false
    var canCancel = false
    if (d.state === 'progressing') {
      // progress
      status = (d.isPaused) ? 'Paused' : (prettyBytes(d.downloadSpeed || 0) + '/s')

      progress = yo`
        <div class="progress">
          <div class="progressbar">
            <progress value=${d.receivedBytes} max=${d.totalBytes}></progress>
          </div>
          <span>${prettyBytes(d.receivedBytes || 0)} / ${prettyBytes(d.totalBytes || 0)}</span>
        </div>`

      // actions
      canCancel = true
      if (d.isPaused) {
        actions = yo`<a onclick=${e => downloadsList.resumeDownload(d)}>Resume</a>`
      } else {
        actions = yo`
          <a onclick=${e => downloadsList.pauseDownload(d)}>
            <i class="fa fa-pause"></i>
            Pause
          </a>`
      }
    } else if (d.state === 'completed') {
      size = yo`<span>${prettyBytes(d.totalBytes || 0)}</span>`

      // actions
      if (!d.fileNotFound) {
        canShow = true

        var removeBtn = yo`<a onclick=${e => downloadsList.removeDownload(d)}>Remove Download</a>`

        if (canCancel) {
          removeBtn = ''// yo`<a onclick=${e => downloadsList.cancelDownload(d)}>Cancel Download</a>`
        }

        actions = [
          yo`<a onclick=${e => downloadsList.openDownload(d)}>Open</a>`,
          yo`<a onclick=${e => downloadsList.showDownload(d)}>Show in Finder</a>`,
          removeBtn
        ]
      } else {
        // TODO
        // action = yo`<div>File not found (moved or deleted)</div>`
      }
    } else {
      status = ucfirst(d.state)
    }

    // render download
    return yo`
      <div class="ll-row download">
        <div class="link">
          <img class="favicon" src=${'beaker-favicon:' + d.url} />
          ${canShow
    ? yo`<a class="title" onclick=${e => downloadsList.openDownload(d)} title=${d.name}>${d.name}</a>`
    : yo`<span class="title" title=${d.name}>${d.name}</a>`}
        </div>
        <div class="status">${status}</div>
        ${progress}
        ${size}
        <div class="actions">${actions}</div>
      </div>`
  }).reverse()

  // empty state
  if (downloadEls.length === 0) {
    downloadEls = yo`<div class="ll-empty">No downloads.</div>`
  }

  return yo`<div class="links-list">${downloadEls}</div>`
}

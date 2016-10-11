import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { ucfirst } from '../../lib/strings'

// exported api
// =

export function render (downloadsList) {
  var downloadEls = downloadsList.downloads.map(d => {
    var progress, status, action
    var canShow = false
    var canCancel = false
    if (d.state === 'progressing') {
      // progress
      status = (d.isPaused) ? 'Paused' : (prettyBytes(d.downloadSpeed) + '/s')
      progress = `${prettyBytes(d.receivedBytes)} / ${prettyBytes(d.totalBytes)}`

      // actions
      canCancel = true
      if (d.isPaused) {
        action = yo`<a class="btn" onclick=${e => downloadsList.resumeDownload(d)} title="Resume"><span class="icon icon-play"></span> Resume</a>`
      } else {
        action = yo`<a class="btn" onclick=${e => downloadsList.pauseDownload(d)} title="Pause"><span class="icon icon-pause"></span> Pause</a>`
      }
    } else if (d.state === 'completed') {
      // progress
      progress = prettyBytes(d.totalBytes)
      status = 'Done'

      // actions
      if (!d.fileNotFound) {
        canShow = true
        action = yo`<a class="btn" onclick=${e => downloadsList.openDownload(d)} title="Open"><span class="icon icon-popup"></span> Open</a>`
      } else {
        // TODO
        // action = yo`<div>File not found (moved or deleted)</div>`
      }
    } else {
      status = ucfirst(d.state)
    }

    // render download
    return yo`<div class="ll-row download">
      <div class="ll-link">
        <img class="favicon" src=${'beaker-favicon:' + d.url} />
        ${ canShow
          ? yo`<a class="ll-title" onclick=${e => downloadsList.openDownload(d)} title=${d.name}>${d.name}</a>`
          : yo`<span class="ll-title" title=${d.name}>${d.name}</a>` }
      </div>
      <div class="ll-status">${status}</div>
      <div class="ll-progress">${progress}</div>
      <div class="ll-progressbar"><progress value=${d.receivedBytes} max=${d.totalBytes}></progress></div>
      <div class="ll-serve">${action}</div>
      <div class="ll-dropdown">${toggleable(yo`
        <div class="dropdown-btn-container" data-toggle-id=${`download-${d.id}`}>
          <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
          <div class="dropdown-btn-list">
            ${ canShow
              ? yo`<a onclick=${e => downloadsList.showDownload(d)}><span class="icon icon-docs"></span> Show in Finder</a>`
              : yo`<a class="disabled"><span class="icon icon-docs"></span> Show in Finder</a>` }
            <div onclick=${e => downloadsList.copyDownloadLink(d)}><span class="icon icon-link"></span> Copy Link</div>
            <hr>
            ${ canCancel
              ? yo`<a onclick=${e => downloadsList.cancelDownload(d)}><span class="icon icon-cancel"></span> Cancel</a>`
              : yo`<a onclick=${e => downloadsList.removeDownload(d)}><span class="icon icon-cancel"></span> Remove</a>` }
          </div>
        </div>
      `)}</div>
    </div>`
  }).reverse()

  // empty state
  if (downloadEls.length === 0) {
    downloadEls = yo`<div class="ll-empty">Files that you download will appear here.</div>`
  }

  return yo`<div class="links-list">${downloadEls}</div>`
}

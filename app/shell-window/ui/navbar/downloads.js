import * as yo from 'yo-yo'
import emitStream from 'emit-stream'
import prettyBytes from 'pretty-bytes'
import { ucfirst } from '../../../lib/strings'

// there can be many downloads btns rendered at once, but they are all showing the same information
// the DownloadsNavbarBtn manages all instances, and you should only create one

export class DownloadsNavbarBtn {
  constructor() {
    this.downloads = beakerDownloads.getDownloads()
    this.sumProgress = null // null means no active downloads
    this.isDropdownOpen = false

    // wire up events
    var dlEvents = emitStream(beakerDownloads.eventsStream())
    dlEvents.on('new-download', this.onNewDownload.bind(this))
    dlEvents.on('sum-progress', this.onSumProgress.bind(this))
    dlEvents.on('updated', this.onUpdate.bind(this))
    dlEvents.on('done', this.onUpdate.bind(this))
  }

  render() {
    // TEMPORARY
    // for now, just show the active downloads
    var activeDownloads = this.downloads
      .filter(d => d.state == 'progressing')

    // render the progress bar if downloading anything
    var progressEl = ''
    if (this.sumProgress && activeDownloads.length) {
      progressEl = yo`<progress value=${this.sumProgress.receivedBytes} max=${this.sumProgress.totalBytes}></progress>`
    }

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      var downloadEls = activeDownloads.map(d => {
        // status
        var status = d.state
        if (status == 'progressing') {
          status = prettyBytes(d.receivedBytes) + ' / ' + prettyBytes(d.totalBytes)
          if (d.isPaused)
            status += ', Paused'
        } else
          status = ucfirst(status)

        // render download
        return yo`<div class="td-item">
          <div class="td-item-name"><strong>${d.name}</strong></div>
          <div class="td-item-status">${status}</div>
          <div class="td-item-progress"><progress value=${d.receivedBytes} max=${d.totalBytes}></progress></div>
          <div class="td-item-ctrls">
            ${d.isPaused
             ? yo`<a href="#" onclick=${e => this.onResume(e, d)}>resume</a>`
             : yo`<a href="#" onclick=${e => this.onPause(e, d)}>pause</a>`}
            |
            <a href="#" onclick=${e => this.onCancel(e, d)}>cancel</a>
          </div>
        </div>`
      })
      dropdownEl = yo`<div class="toolbar-downloads-dropdown">
        ${downloadEls.length ? downloadEls : yo`<div class="td-item empty">No active downloads</div>`}
      </div>`
    }

    // render btn
    return yo`<div class="toolbar-downloads">
      <button class="toolbar-btn toolbar-downloads-btn ${this.isDropdownOpen?'pressed':''}" onclick=${e => this.onClickDownloads(e)} title="Downloads">
        <span class="icon icon-install"></span>
        ${progressEl}
      </button>
      ${dropdownEl}
    </div>`
  }

  updateActives() {
    Array.from(document.querySelectorAll('.toolbar-downloads')).forEach(el => yo.update(el, this.render()))
  }

  onClickDownloads(e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  onNewDownload() {
    // do a little animation
    Array.from(document.querySelectorAll('.toolbar-downloads-btn')).forEach(el => 
      el.animate([
        {transform: 'scale(1.0)', color:'inherit'},
        {transform: 'scale(1.5)', color:'#06c'},
        {transform: 'scale(1.0)', color:'inherit'}
      ], { duration: 300 })
    )
  }

  onSumProgress(sumProgress) {
    this.sumProgress = sumProgress
    this.updateActives()
  }

  onUpdate(download) {
    // patch data each time we get an update
    var target = this.downloads.find(d => d.id == download.id)
    if (target) {
      // patch item
      for (var k in download)
        target[k] = download[k]
    } else
      this.downloads.push(download)
    this.updateActives()
  }

  onPause (e, download) {
    e.preventDefault()
    e.stopPropagation()
    beakerDownloads.pause(download.id)
  }

  onResume (e, download) {
    e.preventDefault()
    e.stopPropagation()
    beakerDownloads.resume(download.id)
  }

  onCancel (e, download) {
    e.preventDefault()
    e.stopPropagation()
    beakerDownloads.cancel(download.id)
  }
}
import * as yo from 'yo-yo'
import emitStream from 'emit-stream'
import prettyBytes from 'pretty-bytes'
import { ucfirst } from '../../../lib/strings'
import * as pages from '../../pages'

// there can be many drop menu btns rendered at once, but they are all showing the same information
// the DropMenuNavbarBtn manages all instances, and you should only create one

export class DropMenuNavbarBtn {
  constructor() {
    this.downloads = []
    this.sumProgress = null // null means no active downloads
    this.isDropdownOpen = false
    this.shouldPersistProgressBar = false

    // fetch current
    beakerDownloads.getDownloads().then(ds => {
      this.downloads = ds
      this.updateActives()
    })

    // wire up events
    var dlEvents = emitStream(beakerDownloads.eventsStream())
    dlEvents.on('new-download', this.onNewDownload.bind(this))
    dlEvents.on('sum-progress', this.onSumProgress.bind(this))
    dlEvents.on('updated', this.onUpdate.bind(this))
    dlEvents.on('done', this.onDone.bind(this))
  }

  render() {
    // show active, then inactive, with a limit of 5 items
    var progressingDownloads = this.downloads.filter(d => d.state == 'progressing').reverse()
    var activeDownloads = (progressingDownloads.concat(this.downloads.filter(d => d.state != 'progressing').reverse())).slice(0,5)

    // render the progress bar if downloading anything
    var progressEl = ''
    if ((progressingDownloads.length > 0 || this.shouldPersistProgressBar) && this.sumProgress && this.sumProgress.receivedBytes <= this.sumProgress.totalBytes) {
      progressEl = yo`<progress value=${this.sumProgress.receivedBytes} max=${this.sumProgress.totalBytes}></progress>`
    }

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      let pageSpecificEls
      let page = pages.getActive()
      if (page.getURL().startsWith('dat://')) {
        pageSpecificEls = [
          yo`<div class="td-item" onclick=${e => this.onOpenView(e, 'files')}><span class="icon icon-folder"></span> View Site Files</div>`,
          yo`<div class="td-item" onclick=${e => this.onOpenView(e, 'fork')}><span class="icon icon-flow-branch" style="position: relative; left: 2px"></span> Fork this Site</div>`,
          yo`<div class="td-item" onclick=${e => this.onToggleLiveReloading(e)}><span class="icon icon-flash" style="position: relative; left: -1px"></span> Turn ${page.isLiveReloading ? 'off' : 'on'} Live Reloading</div>`,
          yo`<hr />`
        ]
      }

      let downloadEls = activeDownloads.map(d => {
        // status
        var status = d.state
        if (status == 'progressing') {
          status = prettyBytes(d.receivedBytes) + ' / ' + prettyBytes(d.totalBytes)
          if (d.isPaused)
            status += ', Paused'
        } else
          status = ucfirst(status)

        // ctrls
        var ctrlsEl
        if (d.state == 'completed') {
          // actions
          if (!d.fileNotFound) {
            ctrlsEl = yo`<div class="td-item-ctrls">
              <a href="#" onclick=${e => this.onOpen(e, d)}>open file</a> |
              <a href="#" onclick=${e => this.onShow(e, d)}>show in folder</buttoan>
            </div>`
          } else {
            ctrlsEl = yo`<div class="td-item-ctrls">File not found (moved or deleted)</div>`
          }
        } else if (d.state == 'progressing') {
          ctrlsEl = yo`<div class="td-item-ctrls">
            ${d.isPaused
             ? yo`<a href="#" onclick=${e => this.onResume(e, d)}>resume</a>`
             : yo`<a href="#" onclick=${e => this.onPause(e, d)}>pause</a>`}
            |
            <a href="#" onclick=${e => this.onCancel(e, d)}>cancel</a>
          </div>`
        }

        // render download
        return yo`<div class="td-item border">
          <div class="td-item-name"><strong>${d.name}</strong></div>
          <div class="td-item-status">${status}</div>
          ${ d.state == 'progressing'
            ? yo`<div class="td-item-progress"><progress value=${d.receivedBytes} max=${d.totalBytes}></progress></div>`
            : '' }
          ${ctrlsEl}
        </div>`
      })
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-drop-menu-dropdown">
        ${pageSpecificEls}
        <div class="td-item" onclick=${e => this.onOpenPage(e, 'beaker:downloads')}><span class="icon icon-down-circled"></span> Downloads</div>
        <div class="td-item" onclick=${e => this.onOpenPage(e, 'beaker:history')}><span class="icon icon-back-in-time"></span> History</div>
        <div class="td-item" onclick=${e => this.onOpenPage(e, 'beaker:settings')}><span class="icon icon-list"></span> Settings</div>
        ${downloadEls.length ? yo`<hr />` : ''}
        ${downloadEls}
        <hr />
        <div class="td-item" onclick=${e => this.onOpenPage(e, 'https://groups.google.com/forum/#!forum/beaker-browser')}><span class="icon icon-mail"></span> Mailing List</div>
        <div class="td-item" onclick=${e => this.onOpenPage(e, 'https://github.com/beakerbrowser/beaker/issues')}><span class="icon icon-attention"></span> Report an Issue</div>
      </div>`
    }

    // render btn
    return yo`<div class="toolbar-drop-menu">
      <button class="toolbar-btn toolbar-drop-menu-btn ${this.isDropdownOpen?'pressed':''}" onclick=${e => this.onClickBtn(e)} title="Menu">
        <span class="icon icon-down-open-big"></span>
        ${progressEl}
      </button>
      ${dropdownEl}
    </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.toolbar-drop-menu')).forEach(el => yo.update(el, this.render()))
  }

  doAnimation () {
    Array.from(document.querySelectorAll('.toolbar-drop-menu-btn')).forEach(el => 
      el.animate([
        {transform: 'scale(1.0)', color:'inherit'},
        {transform: 'scale(1.5)', color:'#06c'},
        {transform: 'scale(1.0)', color:'inherit'}
      ], { duration: 300 })
    )
  }

  onClickBtn (e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.shouldPersistProgressBar = false // stop persisting if we were, the user clicked
    this.updateActives()
  }

  onNewDownload () {
    this.doAnimation()
  }

  onSumProgress (sumProgress) {
    this.sumProgress = sumProgress
    this.updateActives()
  }

  onUpdate (download) {
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

  onDone (download) {
    this.shouldPersistProgressBar = true // keep progress bar up so the user notices
    this.doAnimation()
    this.onUpdate(download)
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

  onShow (e, download) {
    e.preventDefault()
    e.stopPropagation()
    beakerDownloads.showInFolder(download.id)
      .catch(err => {
        download.fileNotFound = true
        this.updateActives()
      })
  }

  onOpen (e, download) {
    e.preventDefault()
    e.stopPropagation()
    beakerDownloads.open(download.id)
      .catch(err => {
        download.fileNotFound = true
        this.updateActives()
      })
  }

  onOpenView (e, view) {
    // close dropdown
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()

    var page = pages.getActive()
    if (page.getURL().startsWith('dat://')) {
      // get the target url
      var url = page.getViewFilesURL(view)
      if (!url) return

      // load url
      page.loadURL(url)
    }
  }

  onToggleLiveReloading (e) {
    // close dropdown
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()

    // toggle
    pages.getActive().toggleLiveReloading()
  }

  onOpenPage (e, url) {
    pages.setActive(pages.create(url))
    this.isDropdownOpen = false
    this.updateActives()
  }
}

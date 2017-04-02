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
      let page = pages.getActive()
      let isDatSite = page.getURL().startsWith('dat://')

      let downloadEls = activeDownloads.map(d => {
        // status
        var status = d.state === 'completed' ? '' : d.state
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
            ctrlsEl = yo`
              <li class="download-item-ctrls complete">
                <a onclick=${e => this.onOpen(e, d)}>Open file</a>
                <a onclick=${e => this.onShow(e, d)}>Show in folder</a>
              </li>`
          } else {
            ctrlsEl = yo`
              <li class="download-item-ctrls not-found">
                File not found (moved or deleted)
              </li>`
          }
        } else if (d.state == 'progressing') {
          ctrlsEl = yo`
            <li class="download-item-ctrls paused">
              ${d.isPaused
              ? yo`<a onclick=${e => this.onResume(e, d)}>Resume</a>`
              : yo`<a onclick=${e => this.onPause(e, d)}>Pause</a>`}
              <a onclick=${e => this.onCancel(e, d)}>Cancel</a>
            </li>`
        }

        // render download
        return yo`
          <li class="download-item">
            <div class="name">${d.name}</div>
            <div class="status">
              ${ d.state == 'progressing'
                ? yo`<progress value=${d.receivedBytes} max=${d.totalBytes}></progress>`
                : '' }
              ${status}
            </div>
            ${ctrlsEl}
          </li>`
      })
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items with-triangle visible">
            <div class="grid page">
              <div class="grid-item ${!isDatSite ? 'disabled' : ''}" onclick=${isDatSite ? (e => this.onEdit(e)) : undefined}>
                <i class="fa fa-pencil-square-o"></i>
                Edit Site
              </div>
              <div class="grid-item ${!isDatSite ? 'disabled' : ''}" onclick=${isDatSite ? (e => this.onFork(e)) : undefined}>
                <i class="fa fa-code-fork"></i>
                Fork Site
              </div>
              <div class="grid-item" onclick=${e => this.onCreateSite(e)}>
                <i class="fa fa-file-o"></i>
                New Site
              </div>
            </div>

            <hr />

            <div class="grid default">
              <div class="grid-item" onclick=${e => this.onOpenPage(e, 'beaker://history')}>
                <i class="fa fa-history"></i>
                History
              </div>

              <div class="grid-item" onclick=${e => this.onOpenPage(e, 'beaker://network')}>
                <i class="fa fa-share-alt"></i>
                Network
              </div>
              
              <div class="grid-item" onclick=${e => this.onOpenPage(e, 'beaker://editor')}>
                <i class="fa fa-pencil"></i>
                Editor
              </div>

              <div class="grid-item" onclick=${e => this.onOpenPage(e, 'beaker://downloads')}>
                <i class="fa fa-download"></i>
                Downloads
              </div>

              <div class="grid-item" onclick=${e => this.onOpenPage(e, 'beaker://bookmarks')}>
                <i class="fa fa-star"></i>
                Bookmarks
              </div>

              <div class="grid-item" onclick=${e => this.onOpenPage(e, 'beaker://settings')}>
                <i class="fa fa-gear"></i>
                Settings
              </div>
            </div>

            ${downloadEls.length ? yo`
              <div>
                <hr>
                <div class="downloads">
                  <h2>Downloads</h2>
                  <ul class="downloads-list">${downloadEls}</ul>
                </div>
              </div>` : ''}

            <div class="footer">
              <a onclick=${e => this.onOpenPage(e, 'https://github.com/beakerbrowser/beaker/issues')}>
                <i class="fa fa-info-circle"></i>
                <span>Report an Issue</span>
              </a>
              <a onclick=${e => this.onOpenPage(e, 'https://beakerbrowser.com/docs/')}>
                <i class="fa fa-question"></i>
                <span>Help</span>
              </a>
            </div>
          </div>
        </div>`
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu">
        <button class="toolbar-btn toolbar-dropdown-menu-btn ${this.isDropdownOpen?'pressed':''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <span class="fa fa-bars"></span>
          ${progressEl}
        </button>
        ${dropdownEl}
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.toolbar-dropdown-menu')).forEach(el => yo.update(el, this.render()))
  }

  doAnimation () {
    Array.from(document.querySelectorAll('.toolbar-dropdown-menu-btn')).forEach(el =>
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

    // open the dropdown
    this.isDropdownOpen = true
    this.updateActives()
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

  onClearDownloads (e) {
    e.preventDefault()
    e.stopPropagation()
    this.downloads = []
    this.updateActives()
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

  async onFork (e) {
    // close dropdown
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()

    var page = pages.getActive()
    if (!page || !page.getURL().startsWith('dat://')) {
      return
    }
    var archive = await DatArchive.fork(page.getURL())
    page.loadURL(archive.url)
  }


  async onEdit (e) {
    // close dropdown
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()

    var page = pages.getActive()
    if (!page || !page.getURL().startsWith('dat://')) {
      return
    }
    page.loadURL(`beaker://editor/${page.getURL().slice('dat://'.length)}`)
  }

  async onCreateSite (e) {
    // close dropdown
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()

    // create a new archive
    var archive = await beaker.archives.create()

    // open the archive in the editor in a new page
    pages.setActive(pages.create(`beaker://editor/${archive.url.slice('dat://'.length)}`))
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

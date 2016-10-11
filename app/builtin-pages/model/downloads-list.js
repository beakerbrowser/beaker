import co from 'co'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import { writeToClipboard } from '../../lib/fg/event-handlers'

// globals
// =

// emit-stream for download events, only one per document is needed
var dlEvents

// exported api
// =

export default class DownloadsList extends EventEmitter {
  constructor () {
    super()

    // declare attributes
    this.downloads = []

    // bind the event handlers
    this.onNewDownload = e => this._onNewDownload(e)
    this.onUpdateDownload = e => this._onUpdateDownload(e)

    // wire up events
    if (!dlEvents) {
      dlEvents = emitStream(beakerDownloads.eventsStream())
    }
    dlEvents.on('new-download', this.onNewDownload)
    dlEvents.on('updated', this.onUpdateDownload)
    dlEvents.on('done', this.onUpdateDownload)
  }

  setup () {
    var self = this
    return co(function * () {
      // fetch downloads
      self.downloads = yield beakerDownloads.getDownloads()
    })
  }

  destroy () {
    // unwire events
    this.removeAllListeners()
    dlEvents.removeListener('new-download', this.onNewDownload)
    dlEvents.removeListener('updated', this.onUpdateDownload)
    dlEvents.removeListener('done', this.onUpdateDownload)
  }

  // actions
  // =

  pauseDownload (download) {
    beakerDownloads.pause(download.id)
  }

  resumeDownload (download) {
    beakerDownloads.resume(download.id)
  }

  cancelDownload (download) {
    beakerDownloads.cancel(download.id)
  }

  copyDownloadLink (download) {
    writeToClipboard(download.url)
  }

  showDownload (download) {
    beakerDownloads.showInFolder(download.id)
      .catch(err => {
        download.fileNotFound = true
        this.emit('changed')
      })
  }

  openDownload (download) {
    beakerDownloads.open(download.id)
      .catch(err => {
        download.fileNotFound = true
        this.emit('changed')
      })
  }

  removeDownload (download) {
    beakerDownloads.remove(download.id)
    this.downloads.splice(this.downloads.indexOf(download), 1)
    this.emit('changed')
  }

  // event handlers
  // =

  _onNewDownload () {
    // do a little animation
    // TODO
  }

  _onUpdateDownload (download) {
    // patch data each time we get an update
    var target = this.downloads.find(d => d.id === download.id)
    if (target) {
      // patch item
      for (var k in download)
        target[k] = download[k]
    } else {
      this.downloads.push(download)
    }
    this.emit('changed')
  }
}

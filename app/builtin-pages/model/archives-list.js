import co from 'co'
import emitStream from 'emit-stream'
import speedometer from 'speedometer'
import EventEmitter from 'events'
import { throttle, debounce } from '../../lib/functions'

// constants
// =

// how much time to wait between throttle emits
const EMIT_CHANGED_WAIT = 500

// globals
// =

// emit-stream for archive events, only one per document is needed
var archivesEvents

// exported api
// =

export default class ArchivesList extends EventEmitter {
  constructor () {
    super()

    // declare attributes
    this.archives = []

    // bind the event handlers
    this.onUpdateArchive = e => this._onUpdateArchive(e)
    this.onUpdatePeers = e => this._onUpdatePeers(e)
    this.onDownload = e => this._onDownload(e)

    // wire up events
    if (!archivesEvents) {
      archivesEvents = emitStream(datInternalAPI.archivesEventStream())
    }
    archivesEvents.on('update-archive', this.onUpdateArchive)
    archivesEvents.on('update-peers', this.onUpdatePeers)
    archivesEvents.on('download', this.onDownload)

    // create a throttled 'change' emiter
    this.emitChanged = throttle(() => this.emit('changed'), EMIT_CHANGED_WAIT)

    // This gets called by the download event to make sure that, when the transfer...
    //   completes, a 'changed' event is emitted.
    //   This ensures that the download speedometer gets re-rendered at zero. 
    this.zeroSpeedometerAfterDownload = debounce(archive => {
      archive.stats.downloadSpeed = speedometer()
      this.emit('changed')
    }, 1e3)
  }

  setup ({ filter, fetchStats } = {}) {
    var self = this
    return co(function * () {
      // fetch archives
      self.archives = yield datInternalAPI.queryArchives(filter, { includeMeta: true })
      self.archives.sort(archiveSortFn)
      // fetch stats
      if (fetchStats) {
        var stats = yield Promise.all(self.archives.map(a => datInternalAPI.getArchiveStats(a.key)))
        self.archives.forEach((archive, i) => {
          archive.stats = stats[i]
          archive.stats.downloadSpeed = speedometer()
        })
      }
    })
  }

  destroy () {
    // unwire events
    this.removeAllListeners()
    archivesEvents.removeListener('update-archive', this.onUpdateArchive)
    archivesEvents.removeListener('update-peers', this.onUpdatePeers)
  }

  // event handlers
  // =

  _onUpdateArchive (update) {
    // find the archive being updated
    var archive = this.archives.find(a => a.key === update.key)
    if (archive) {
      // patch the archive
      for (var k in update)
        archive[k] = update[k]
      this.emitChanged()
    }
  }

  _onUpdatePeers ({ key, peers }) {
    // find the archive being updated
    var archive = this.archives.find(a => a.key === key)
    if (archive) {
      archive.peers = peers // update
      this.emitChanged()
    }
  }

  _onDownload ({ key, feed, index, bytes }) {
    // only handle updates to the content feed
    if (feed === 'content') {

      // find the archive being updated
      var archive = this.archives.find(a => a.key === key)
      if (archive && archive.stats) {
        // update stats
        archive.stats.blocksProgress++
        archive.stats.bytesTotal += bytes
        archive.stats.downloadSpeed(bytes)
        this.emitChanged()
        this.zeroSpeedometerAfterDownload(archive)
      }
    }
  }
}

// helpers
// =

function archiveSortFn (a, b) {
  return b.mtime - a.mtime
}

import co from 'co'
import emitStream from 'emit-stream'
import EventEmitter from 'events'

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

    // wire up events
    if (!archivesEvents) {
      archivesEvents = emitStream(datInternalAPI.archivesEventStream())
    }
    archivesEvents.on('update-archive', this.onUpdateArchive)
    archivesEvents.on('update-peers', this.onUpdatePeers)
  }

  setup ({ filter, fetchStats } = {}) {
    var self = this
    return co(function * () {
      // fetch archives
      self.archives = yield datInternalAPI.getSavedArchives()
      if (filter) {
        self.archives = self.archives.filter(filter)
      }
      self.archives.sort(archiveSortFn)
      // fetch stats
      if (fetchStats) {
        var stats = yield Promise.all(self.archives.map(a => datInternalAPI.getArchiveStats(a.key)))
        self.archives.forEach((archive, i) => archive.stats = stats[i])
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
      this.emit('changed')
    }
  }

  _onUpdatePeers ({ key, peers }) {
    // find the archive being updated
    var archive = this.archives.find(a => a.key === key)
    if (archive) {
      archive.peers = peers // update
      this.emit('changed')
    }
  }
}

// helpers
// =

function archiveSortFn (a, b) {
  return b.mtime - a.mtime
}

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

    // wire up events
    if (!archivesEvents) {
      archivesEvents = emitStream(datInternalAPI.archivesEventStream())
    }
    archivesEvents.on('update-archive', this.onUpdateArchive)

    // create a throttled 'change' emiter
    this.emitChanged = throttle(() => this.emit('changed'), EMIT_CHANGED_WAIT)
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
}

// helpers
// =

function archiveSortFn (a, b) {
  return b.mtime - a.mtime
}

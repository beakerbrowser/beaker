import {EventEmitter} from 'events'
import throttle from 'lodash.throttle'

// constants
// =

// how much time to wait between throttle emits
const EMIT_CHANGED_WAIT = 30

export default class ArchiveProgressMonitor extends EventEmitter {
  constructor (archive) {
    super()
    this.archive = archive
    this.downloaded = 0
    this.blocks = 0
    this.onDownload = this.onDownload.bind(this)

    // create a throttled 'change' emiter
    this.emitChanged = throttle(() => this.emit('changed'), EMIT_CHANGED_WAIT)
  }

  async fetchAllStats () {
    // list all files
    var entries = await this.archive.readdir('/', {recursive: true, stat: true})

    // count blocks
    this.downloaded = 0
    this.blocks = 0
    entries.forEach(entry => {
      this.downloaded += entry.stat.downloaded
      this.blocks += entry.stat.blocks
    })
  }

  startListening () {
    // start watching network activity
    this.archive.addEventListener('download', this.onDownload)
    this.interval = setInterval(() => this.fetchAllStats(), 10e3) // refetch stats every 10s
    return this.fetchAllStats()
  }

  stopListening () {
    clearInterval(this.interval)
    this.archive.removeEventListener('download', this.onDownload)
  }

  get current () {
    return Math.min(Math.round(this.downloaded / this.blocks * 100), 100)
  }

  get isComplete () {
    return this.downloaded >= this.blocks
  }

  onDownload (e) {
    // we dont need perfect precision --
    // rather than check if the block is one of ours, assume it is
    // we'll refetch the full stats every 10s to correct inaccuracies
    // (and we shouldnt be downloading historic data anyway)
    this.downloaded++

    // is this a block in one of our files?
    // for (var k in this.allfiles) {
    //   let file = this.allfiles[k]
    //   let block = e.block - file.content.blockOffset
    //   if (block >= 0 && block < file.blocks) {
    //     file.downloaded++
    //     this.downloaded++
    //   }
    // }
    this.emitChanged()
  }
}

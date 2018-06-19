/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import throttle from 'lodash.throttle'
import * as toast from './toast'
import * as contextMenu from './context-menu'
import {pluralize} from '../../lib/strings'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// globals
// =

var idCounter = 0

// exports
// =

export default class DatNetworkActivity {
  constructor (filter = 'owned') {
    this.id = (++idCounter)
    this.slideState = undefined
    this.archives = undefined
    this.totalBytesHosting = 0
    this.totalArchivesHosting = 0
    this.currentFilter = filter
    this.currentSort = ['title', -1]
    this.currentlyHighlightedKey = undefined

    beaker.archives.addEventListener('network-changed', throttle(this.onNetworkChanged.bind(this), 1e3))
  }

  // loading
  // =

  async fetchArchives () {
    if (this.currentFilter === 'seeding') {
      this.archives = await beaker.archives.list({isSaved: true, isOwner: false})
    } else if (this.currentFilter === 'owned') {
      this.archives = await beaker.archives.list({isOwner: true})
    } else if (this.currentFilter === 'cache') {
      this.archives = await beaker.archives.list({isSaved: false, inMemory: true})
    } else {
      this.archives = await beaker.archives.list()
    }
    this.sortArchives()

    this.totalArchivesHosting = this.archives.length
    this.totalBytesHosting = this.archives.reduce((sum, a) => {
      return sum + a.size
    }, 0)

    this.rerender()
  }

  // rendering
  // =

  // method to render at a place in the page
  // eg yo`<div>${myFilesBrowser.render()}</div>`
  render () {
    if (!this.archives) {
      this.fetchArchives() // trigger load
      return yo`<div id=${'dat-network-activity-' + this.id} class="dat-network-activity loading">Loading...</div>`
    }

    const f = (id, label) => yo`
      <button
        class="plain ${this.currentFilter === id ? 'active' : ''}"
        onclick=${e => this.onClickFilter(id)}>
        ${label}
      </button>`

    return yo`
      <div id=${'dat-network-activity-' + this.id} class="dat-network-activity">
        <div class="archives">
          <button class="link clear-cache" onclick=${() => this.onClearCache()}>Clear cache</button>
          <div class="filters">
            ${f('owned', 'Your archives')}
            ${f('seeding', 'Seeding')}
            ${f('cache', 'Cache')}
          </div>
          <div class="heading">
            ${this.renderHeading('title', 'Title')}
            ${this.renderHeading('peers', 'Peers')}
            ${this.renderHeading('size', 'Size')}
            ${this.renderHeading('mtime', 'Last updated')}
          </div>
          ${this.archives.map(a => this.renderArchive(a))}
        </div>
      </div>
    `
  }

  // method to re-render in place
  // eg myFilesBrowser.rerender()
  rerender () {
    let el = document.querySelector('#dat-network-activity-' + this.id)
    if (el) yo.update(el, this.render())
  }

  renderHeading (id, label) {
    const icon = this.currentSort[0] === id
      ? this.currentSort[1] > 0
        ? yo`<span class="fa fa-angle-up"></span>`
        : yo`<span class="fa fa-angle-down"></span>`
      : ''

    return yo`
      <div class=${id}>
        <a onclick=${e => this.onClickHeading(id)}>${label}</a> ${icon}
      </div>
    `
  }

  renderArchive (archive) {
    // calculate how much longer the archive will be re-hosted
    const highlightedCls = this.currentlyHighlightedKey === archive.key ? 'highlighted' : ''
    const inTrash = archive.isOwner && !archive.userSettings.isSaved

    return yo`
      <div class="ll-row archive ${highlightedCls}" oncontextmenu=${e => this.onContextmenuArchive(e, archive)}>
        <img class="favicon" src="beaker-favicon:${archive.url}" />

        <a href=${archive.url} class="title" title=${archive.title}>
          ${archive.title || yo`<em>Untitled</em>`}
          ${inTrash ? yo`<span class="badge">In Trash</span>` : ''}
        </a>

        <div class="peers">
          ${archive.userSettings.networked
            ? `${archive.peers} ${pluralize(archive.peers, 'peer')}`
            : yo`<span><i class="fa fa-plug"></i> Offline</span>`}
        </div>

        <div class="size">
          ${prettyBytes(archive.size)}
        </div>

        <div class="mtime">
          ${mtimeCache(archive)}
        </div>
      </div>
    `
  }

  // events
  // =

  onClickHeading (id) {
    if (this.currentSort[0] === id) {
      this.currentSort[1] = this.currentSort[1] * -1
    } else {
      this.currentSort[0] = id
      this.currentSort[1] = -1
    }
    this.sortArchives()
    this.rerender()
  }

  async onContextmenuArchive (e, archive) {
    e.preventDefault()

    this.currentlyHighlightedKey = archive.key
    this.rerender()

    const items = [
      {icon: 'link', label: 'Copy URL', click: () => this.onCopyURL(archive)},
      {icon: 'book', label: 'Open in Library', click: () => this.onOpenInLibrary(archive)},
      {icon: 'bug', label: 'Network debugger', click: () => this.onOpenInSwarmDebugger(archive)},
      archive.userSettings.networked
        ? {icon: 'plug', label: 'Disconnect from the swarm', click: () => this.onToggleNetworked(archive)}
        : {icon: 'exchange', label: 'Connect to the swarm', click: () => this.onToggleNetworked(archive)},
      {icon: 'times-circle', label: 'Purge archive and files', click: () => this.onDeleteFiles(archive)}
    ]
    await contextMenu.create({x: e.clientX, y: e.clientY, items})

    this.currentlyHighlightedKey = undefined
    this.rerender()
  }

  onClickFilter (filter) {
    this.currentFilter = filter
    this.fetchArchives()
  }

  onCopyURL (archive) {
    writeToClipboard(encodeURI(archive.url))
    toast.create('URL copied to clipboard')
  }

  onOpenInLibrary (archive) {
    window.open('beaker://library/' + archive.url)
  }

  onOpenInSwarmDebugger (archive) {
    window.open('beaker://swarm-debugger/' + archive.url)
  }

  async onToggleNetworked (archive) {
    try {
      const networked = !archive.userSettings.networked
      await (new DatArchive(archive.key)).configure({networked})
      archive.userSettings.networked = networked
      this.rerender()
    } catch (e) {
      console.error(e)
      toast.create('Something went wrong', 'error')
      return
    }
  }

  async onDeleteFiles (archive) {
    try {
      if (!confirm('This will delete this archive. Are you sure?')) {
        return
      }
      const res = await beaker.archives.delete(archive.key)
      toast.create(`Files deleted (${prettyBytes(res.bytes)} freed)`, '', 5e3)
      this.fetchArchives()
    } catch (e) {
      console.error(e)
      toast.create('Something went wrong', 'error')
      return
    }
  }

  async onNetworkChanged ({details}) {
    if (!this.archives) return
    var archive = this.archives.find(a => details.url === a.url)
    if (archive) {
      archive.peers = details.peerCount
      if (this.currentSort[0] === 'peers') {
        this.sortArchives()
      }
      this.rerender()
    }
  }

  async onClearCache () {
    const results = await beaker.archives.clearGarbage({isOwner: false})
    await beaker.archives.clearDnsCache()
    console.debug('Dat cache cleared', results)
    toast.create(`Cache cleared (${prettyBytes(results.totalBytes)} freed from ${results.totalArchives} archives)`, '', 5e3)
    this.fetchArchives()
  }

  // helpers
  // =

  sortArchives () {
    this.archives.sort((a, b) => {
      var v
      switch (this.currentSort[0]) {
        case 'peers': v = a.peers - b.peers; break
        case 'size': v = a.size - b.size; break
        case 'mtime': v = a.mtime - b.mtime; break
        case 'title':
        default:
          v = (b.title || '').localeCompare(a.title || '')
      }
      return v * this.currentSort[1]
    })
  }
}

// helper to avoid running date math too much
function mtimeCache (archive) {
  if (!archive.mtime) return ''
  if (!archive.mtimeNice || archive.mtime !== archive.mtimeCached) {
    archive.mtimeNice = niceDate(archive.mtime)
    archive.mtimeCached = archive.mtime
  }
  return archive.mtimeNice
}

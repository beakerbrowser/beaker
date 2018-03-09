/* globals beaker */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import * as toast from './toast'
import * as contextMenu from './context-menu'
import renderGearIcon from '../icon/gear-small'
import {pluralize} from '../../lib/strings'
import {throttle} from '../../lib/functions'
import {niceDate} from '../../lib/time'
import {findParent, writeToClipboard} from '../../lib/fg/event-handlers'

// globals
// =

const NOT = 0
const ONEDAY = 1
const ONEWEEK = 2
const ONEMONTH = 3
const FOREVER = 4
const TIMELENS = [
  () => yo`<span>While visiting</span>`,
  () => yo`<span>1 day</span>`,
  () => yo`<span>1 week</span>`,
  () => yo`<span>1 month</span>`,
  () => yo`<span>Forever</span>`
]
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
    this.currentlyConfiguringKey = undefined
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
      this.archives = await beaker.archives.list({isSaved: false})
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
      return yo`<div id=${'dat-network-activity-'+this.id} class="dat-network-activity loading">Loading...</div>`
    }

    const f = (id, label) => yo`
      <button
        class="plain ${this.currentFilter === id ? 'active' : ''}"
        onclick=${e => this.onClickFilter(id)}>
        ${label}
      </button>`

    return yo`
      <div id=${'dat-network-activity-'+this.id} class="dat-network-activity">
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
    let el = document.querySelector('#dat-network-activity-'+this.id)
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
    const expiresAt = archive.userSettings.expiresAt
    const now = Date.now()
    const timeRemaining = (expiresAt && expiresAt > now) ? moment.duration(expiresAt - now) : null
    const highlightedCls = this.currentlyHighlightedKey === archive.key ? 'highlighted' : ''
    const inTrash = archive.isOwner && !archive.userSettings.isSaved

    let expiresAtStr
    if (!timeRemaining) expiresAtStr = ''
    else if (timeRemaining.asMonths() > 0.5) expiresAtStr = '(1 month remaining)'
    else if (timeRemaining.asWeeks() > 0.5) expiresAtStr = '(1 week remaining)'
    else expiresAtStr = '(1 day remaining)'

    return yo`
      <div class="ll-row archive ${highlightedCls}" oncontextmenu=${e => this.onContextmenuArchive(e, archive)}>
        <img class="favicon" src="beaker-favicon:${archive.url}" />

        <a href=${archive.url} class="title" title=${archive.title}>
          ${archive.title || yo`<em>Untitled</em>`}
          ${inTrash ? yo`<i class="fa fa-trash-o" title="In the trash"></i>` : ''}
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

        ${''/*
          ${expiresAtStr}
          <span class="gear-btn" onclick=${e => this.onClickSettings(archive)}>
            ${renderGearIcon()}
            ${this.renderSeedingMenu(archive)}
          </span>
        </div>*/}
      </div>
    `
  }

  renderSeedingMenu (archive) {
    if (archive.key !== this.currentlyConfiguringKey) return ''

    // calculate the current state
    const isNetworked = archive.userSettings.networked
    const expiresAt = archive.userSettings.expiresAt
    const now = Date.now()
    const timeRemaining = (isNetworked && expiresAt && expiresAt > now) ? moment.duration(expiresAt - now) : null

    var currentSetting
    if (!isNetworked) currentSetting = NOT
    else if (!expiresAt) currentSetting = FOREVER
    else if (timeRemaining.asMonths() > 0.5) currentSetting = ONEMONTH
    else if (timeRemaining.asWeeks() > 0.5) currentSetting = ONEWEEK
    else currentSetting = ONEDAY

    // configure rendering params
    sliderState = typeof sliderState === 'undefined' ? currentSetting : sliderState

    const seedingStatusClass =
      (sliderState == NOT ?
        'red' :
        (sliderState == FOREVER ?
          'green' :
          'yellow'))
    const seedingStatusLabel = timeRemaining && typeof sliderState === 'undefined'
      ? yo`<span>Rehosting (${timeRemaining.humanize()} remaining)</span>`
      : TIMELENS[sliderState]()
    return yo`
      <div class="seeding-menu">
        <div>
          <label for="rehost-period">Seed these files</label>
          <input
            name="rehost-period"
            type="range"
            min="0"
            max="4"
            step="1"
            list="steplist"
            value=${sliderState}
            onchange=${e => onChangeSeedingConfiguration(e)}
            oninput=${e => onChangeSeedingConfiguration(e)} />
          <datalist id="steplist">
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
          </datalist>
        </div>

        <div class="labels">
          <div class="policy">
            <i class="circle ${seedingStatusClass}"></i>
            ${seedingStatusLabel}
          </div>
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
      {icon: 'link', label: 'Copy URL', click: () => this.onCopyURL(archive) },
      {icon: 'book', label: 'Open in Library', click: () => this.onOpenInLibrary(archive) },
      archive.userSettings.networked
        ? {icon: 'plug', label: 'Disconnect from the swarm', click: () => this.onToggleNetworked(archive) }
        : {icon: 'exchange', label: 'Connect to the swarm', click: () => this.onToggleNetworked(archive) },
      {icon: 'times-circle', label: 'Purge archive and files', click: () => this.onDeleteFiles(archive) }
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

  async onClickSettings (archive) {
    currentlyConfiguringKey = archive.key
    render()
    document.body.addEventListener('keyup', onKeyUp)
    document.body.addEventListener('click', onClick)
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
    console.debug('Dat cache cleared', results)
    toast.create(`Cache cleared (${prettyBytes(results.totalBytes)} freed from ${results.totalArchives} archives)`, '', 5e3)
    this.fetchArchives()
  }

  async onChangeSeedingConfiguration (e) {
    sliderState = e.target.value
    const isNetworked = sliderState == NOT ? false : true
    let expiresAt = 0

    if (sliderState == ONEDAY) expiresAt = +(moment().add(1, 'day'))
    if (sliderState == ONEWEEK) expiresAt = +(moment().add(1, 'week'))
    if (sliderState == ONEMONTH) expiresAt = +(moment().add(1, 'month'))

    const tmpArchive = new DatArchive(currentlyConfiguringKey)
    const tmpArchiveInfo = await tmpArchive.getInfo()
    if (tmpArchiveInfo.isOwner) {
      await tmpArchive.configure({networked: isNetworked})
    } else {
      if (isNetworked) {
        await beaker.archives.add(currentlyConfiguringKey, {expiresAt, networked: true})
      } else {
        await beaker.archives.remove(currentlyConfiguringKey)
      }
    }

    render()
  }

  onClick (e) {
    if (!findParent(e.target, 'gear-btn')) {
      destroySeedingMenu()
    }
  }

  onKeyUp (e) {
    e.preventDefault()
    e.stopPropagation()

    if (e.keyCode === 27) {
      destroySeedingMenu()
    }
  }

  // helpers
  // =

  sortArchives () {
    this.archives.sort((a, b) => {
      var v
      switch (this.currentSort[0]) {
        case 'peers': v = a.peers - b.peers; break
        case 'size':  v = a.size - b.size; break
        case 'mtime': v = a.mtime - b.mtime; break
        case 'title':
        default:
          v = (b.title || '').localeCompare(a.title || '')
      }
      return v * this.currentSort[1]
    })
  }

  destroySeedingMenu () {
    currentlyConfiguringKey = undefined
    sliderState = undefined
    document.body.removeEventListener('keyup', onKeyUp)
    document.body.removeEventListener('click', onClick)
    render()
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
/* globals beaker */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import * as toast from './toast'
import * as contextMenu from './context-menu'
import renderTrashIcon from '../icon/trash'
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

// exports
// =

export default class DatNetworkActivity {
  constructor () {
    this.slideState = undefined
    this.archives = undefined
    this.totalBytesHosting = 0
    this.totalArchivesHosting = 0
    this.currentFilter = 'seeding'
    this.currentSort = ['title', -1]
    this.currentlyConfiguringKey = undefined
    this.currentlyHighlightedKey = undefined

    beaker.archives.addEventListener('network-changed', throttle(this.onNetworkChanged.bind(this), 1e3))
  }

  // loading
  // =

  async fetchArchives () {
    this.archives = await beaker.archives.list()
    this.sortArchives()

    // TODO filters?
    // if (this.currentFilter === 'seeding') {
    //   this.archives = await beaker.archives.list({isSaved: true, isNetworked: true})
    // } else if (this.currentFilter === 'offline') {
    //   this.archives = await beaker.archives.list({isSaved: true, isNetworked: false})
    // }

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
      return yo`<div class="dat-network-activity"></div>`
    }

    return yo`
      <div class="dat-network-activity">
        <div class="archives">
          <div class="heading">
            ${this.renderHeading('title', 'Title')}
            ${this.renderHeading('peers', 'Peers')}
            ${this.renderHeading('size', 'Size')}
            ${this.renderHeading('mtime', 'Last updated')}
            <div class="buttons"></div>
          </div>
          ${this.archives.map(a => this.renderArchive(a))}
        </div>
      </div>
    `
  }

  // method to re-render in place
  // eg myFilesBrowser.rerender()
  rerender () {
    let el = document.querySelector('.dat-network-activity')
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

    let expiresAtStr
    if (!timeRemaining) expiresAtStr = ''
    else if (timeRemaining.asMonths() > 0.5) expiresAtStr = '(1 month remaining)'
    else if (timeRemaining.asWeeks() > 0.5) expiresAtStr = '(1 week remaining)'
    else expiresAtStr = '(1 day remaining)'

    return yo`
      <div class="archive ${highlightedCls}" oncontextmenu=${e => this.onContextmenuArchive(e, archive)}>
        <img class="favicon" src="beaker-favicon:${archive.url}" />

        <a href=${archive.url} class="title" title=${archive.title}>
          ${archive.title || yo`<em>Untitled</em>`}
        </a>

        <div class="peers">
          ${archive.peers} ${pluralize(archive.peers, 'peer')}
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

        <div class="buttons">
          ${archive.userSettings.isSaved && !archive.userSettings.networked
            ? yo`
              <button title="Delete these files from your device" class="btn small" onclick=${e => this.onUnsaveArchive(archive)}>
                ${renderTrashIcon()}
              </button>`
            : ''}

          <button class="btn small hosting-btn" onclick=${e => this.onToggleHosting(archive)}>
            ${archive.userSettings.networked
              ? yo`
                <span>
                  Stop syncing
                  <span class="square"></span>
                </span>`
              : yo`
                <span>
                  Sync files ⇧
                </span>`
            }
          </button>
        </div>
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
      {icon: 'folder-open-o', label: 'Open in library', click: () => this.onOpenInLibrary(archive) },
      {icon: 'stop', label: 'Stop syncing', click: () => {}},
      {icon: 'trash', label: 'Delete', click: () => {}},
    ]
    await contextMenu.create({x: e.clientX, y: e.clientY, items})

    this.currentlyHighlightedKey = undefined
    this.rerender()
  }

  onCopyURL (archive) {
    writeToClipboard(archive.url)
    toast.create('URL copied to clipboard')
  }

  onOpenInLibrary (archive) {
    window.open('beaker://library/' + archive.url)
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

  async onUpdateFilter (e) {
    currentFilter = e.target.dataset.filter
    await fetchArchives()
    destroySeedingMenu()
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

  async onToggleHosting (archive) {
    var isNetworked = !archive.userSettings.networked

    if (isNetworked && currentFilter === 'seeding') {
      totalArchivesHosting += 1
      totalBytesHosting += archive.size
    } else if (currentFilter === 'seeding') {
      totalArchivesHosting -= 1
      totalBytesHosting -= archive.size
    }

    // don't unsave the archive if user is owner
    if (archive.isOwner && archive.userSettings.isSaved) {
      var tmpArchive = new DatArchive(archive.url)

      try {
        await tmpArchive.configure({networked: isNetworked})
      } catch (e) {
        toast.create('Something went wrong')
        return
      }
    }

    else {
      // unsave if not owner and update the peer count
      if (archive.userSettings.isSaved) {
        await beaker.archives.remove(archive.key)
        archive.userSettings.isSaved = false
        archive.peers -= 1
      } else {
        await beaker.archives.add(archive.key)
        archive.userSettings.isSaved = true
        archive.peers += 1
      }
    }

    // update the local archives data and re-render
    archive.userSettings.networked = isNetworked
    render()
  }

  async onUnsaveArchive (archive) {
    await beaker.archives.remove(archive.key)
    archive.userSettings.isSaved = false
    totalArchivesHosting -= 1
    totalBytesHosting -= archive.size
    render()
  }

  onClick (e) {
    if (!findParent(e.target, 'gear-btn')) {
      console.log('destroy')
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
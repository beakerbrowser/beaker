/* globals beaker */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import * as toast from '../com/toast'
import renderTrashIcon from '../icon/trash'
import renderGearIcon from '../icon/gear-small'
import {pluralize} from '../../lib/strings'
import {findParent} from '../../lib/fg/event-handlers'

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
let sliderState
let archives = []
let totalBytesHosting = 0
let totalArchivesHosting = 0
let currentFilter = 'seeding'
let currentlyConfiguringKey
let currentUserProfile

// main
// =

setup()
async function setup () {
  currentUserProfile = await beaker.profiles.getCurrentUserProfile()
  await fetchArchives()
  beaker.archives.addEventListener('network-changed', onNetworkChanged)
  render()
}

async function fetchArchives () {
  if (currentFilter === 'seeding') {
    archives = await beaker.archives.list({isSaved: true, isNetworked: true})
  } else if (currentFilter === 'offline') {
    archives = await beaker.archives.list({isSaved: true, isNetworked: false})
  }

  totalArchivesHosting = archives.length
  totalBytesHosting = archives.reduce((sum, a) => {
    return sum + a.size
  }, 0)
}

// events
// =

async function onClickSettings (archive) {
  currentlyConfiguringKey = archive.key
  render()
  document.body.addEventListener('keyup', onKeyUp)
  document.body.addEventListener('click', onClick)
}

async function onNetworkChanged ({details}) {
  var archive = archives.find(a => details.url === a.url)
  if (archive) archive.peers = details.peerCount
  render()
}

async function onUpdateFilter (e) {
  currentFilter = e.target.dataset.filter
  await fetchArchives()
  destroySeedingMenu()
}

async function onChangeSeedingConfiguration (e) {
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

async function onToggleHosting (archive) {
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

async function onUnsaveArchive (archive) {
  await beaker.archives.remove(archive.key)
  archive.userSettings.isSaved = false
  totalArchivesHosting -= 1
  totalBytesHosting -= archive.size
  render()
}

function onClick (e) {
  if (!findParent(e.target, 'gear-btn')) {
    console.log('destroy')
    destroySeedingMenu()
  }
}

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroySeedingMenu()
  }
}

function destroySeedingMenu () {
  currentlyConfiguringKey = undefined
  sliderState = undefined
  document.body.removeEventListener('keyup', onKeyUp)
  document.body.removeEventListener('click', onClick)
  render()
}

// rendering
// =

function render () {
  yo.update(document.querySelector('.network-wrapper'), yo`
    <div class="network-wrapper builtin-wrapper">
      <div>
        <div class="builtin-sidebar">
          <h1>Network Activity</h1>

          <p>Review and manage your network activity</p>

          <div class="section">
            <div onclick=${onUpdateFilter} data-filter="seeding" class="nav-item ${currentFilter === 'seeding' ? 'active' : ''}">
              Currently seeding
            </div>

            <div onclick=${onUpdateFilter} data-filter="offline" class="nav-item ${currentFilter === 'offline' ? 'active' : ''}">
              Offline
            </div>
          </div>
        </div>

        <div class="builtin-main">
          ${renderHeader()}
          <div>${renderArchives()}</div>
        </div>
      </div>
    </div>
  </div>`)
}

function renderHeader () {
  if (currentFilter === 'seeding') {
    return yo`
      <div class="builtin-header fixed">
        ${totalArchivesHosting} ${pluralize(totalArchivesHosting, 'archive')}
        —
        ${prettyBytes(totalBytesHosting)}
      </div>
    `
  } else {
    return yo`
      <div class="builtin-header fixed">
        ${totalArchivesHosting} ${pluralize(totalArchivesHosting, 'archive')}
        —
        ${prettyBytes(totalBytesHosting)}
      </div>
    `
  }
}

function renderSeedingMenu (archive) {
  if (archive.key !== currentlyConfiguringKey) return ''

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

function renderArchives () {
  return yo`
    <ul class="archives">${archives.map(renderArchive)}</ul>
  `
}

function renderArchive (archive) {
  // calculate how much longer the archive will be re-hosted
  const expiresAt = archive.userSettings.expiresAt
  const now = Date.now()
  const timeRemaining = (expiresAt && expiresAt > now) ? moment.duration(expiresAt - now) : null

  let expiresAtStr
  if (!expiresAt) expiresAtStr = ''
  else if (timeRemaining.asMonths() > 0.5) expiresAtStr = '(1 month remaining)'
  else if (timeRemaining.asWeeks() > 0.5) expiresAtStr = '(1 week remaining)'
  else expiresAtStr = '(1 day remaining)'

  return yo`
    <li class="row thick archive">
      <div>
        <img class="favicon" src="beaker-favicon:${archive.url}" />

        <span class="info">
          <a href=${archive.url} class="title">
            ${archive.title || yo`<em>Untitled</em>`}
          </a>

          <span class="status">
            <span class="circle ${archive.userSettings.networked ? 'green' : 'red'}"></span>
          </a>

          <div class="metadata">
            ${archive.peers} ${pluralize(archive.peers, 'peer')}
            <span class="bullet">•</span>
            ${prettyBytes(archive.size)}

            ${archive.url !== currentUserProfile._origin ? yo`
              <span>
                <span class="bullet">•</span>
                ${expiresAtStr}
                <span class="gear-btn" onclick=${e => onClickSettings(archive)}>
                  ${renderGearIcon()}
                  ${renderSeedingMenu(archive)}
                </span>
              </span>`
            : ''}
          </div>
        </span>
      </div>

      <div class="buttons">
      ${archive.userSettings.isSaved && !archive.userSettings.networked ? yo`
        <button title="Delete these files from your device" class="btn" onclick=${e => onUnsaveArchive(archive)}>
          ${renderTrashIcon()}
        </button>` : ''}

        ${archive.url !== currentUserProfile._origin ? yo`
          <button class="btn hosting-btn" onclick=${e => onToggleHosting(archive)}>
            ${archive.userSettings.networked
              ? yo`
                <span>
                  Stop seeding
                  <span class="square"></span>
                </span>`
              : yo`
                <span>
                  Seed files ⇧
                </span>`
            }
          </button>` : ''}
      </div>
    </li>
  `
}
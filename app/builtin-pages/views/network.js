/* globals beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import renderSidebar from '../com/sidebar'
import * as toast from '../com/toast'
import renderTrashIcon from '../icon/trash'
import {pluralize} from '../../lib/strings'

// globals
// =
let archives = []
let totalBytesHosting = 0
let totalArchivesHosting = 0
let currentFilter = 'seeding'

// main
// =

setup()
async function setup () {
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

async function onNetworkChanged ({details}) {
  var archive = archives.find(a => details.url === a.url)
  if (archive) archive.peers = details.peerCount
  render()
}

async function onUpdateFilter (e) {
  currentFilter = e.target.dataset.filter
  console.log(currentFilter)
  await fetchArchives()
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
      toast.create('You cannot manage the network status of your user profile', 'error')
      return
    }
  }

  // unsave if not owner and update the peer count
  else {
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

// rendering
// =

function render () {
  yo.update(document.querySelector('.network-wrapper'), yo`
    <div class="network-wrapper builtin-wrapper">
      ${renderSidebar('network')}
      <div>
        <div class="builtin-sidebar">
          <h1>Network Activity</h1>

          <p>Review and manage your network activity.</p>

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
          <div class="view">${renderArchives()}</div>
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

function renderArchives () {
  return yo`
    <ul class="archives">${archives.map(renderArchive)}</ul>
  `
}

function renderArchive (archive) {
  return yo`
    <li class="archive">
      <div>
        <img class="favicon" src="beaker-favicon:${archive.url}" />

        <span class="info">
          <a href=${archive.url} class="title">
            ${archive.title || yo`<em>Untitled</em>`}
            <span class="circle ${archive.userSettings.networked ? 'green' : 'red'}"></span>
          </a>

          <div class="metadata">
            ${archive.peers} ${pluralize(archive.peers, 'peer')}
            <span class="bullet">•</span>
            ${prettyBytes(archive.size)}
          </div>
        </span>
      </div>

      <div>
      ${archive.userSettings.isSaved && !archive.userSettings.networked ? yo`
        <button title="Delete these files from your device" class="btn" onclick=${e => onUnsaveArchive(archive)}>
          ${renderTrashIcon()}
        </button>` : ''}

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
        </button>
      </div>
    </li>
  `
}
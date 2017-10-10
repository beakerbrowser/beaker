/* globals beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import renderSidebar from '../com/sidebar'
import {pluralize} from '../../lib/strings'

// globals
// =
let archives = []

// main
// =

setup()
async function setup () {
  await fetchArchives()
  beaker.archives.addEventListener('network-changed', onNetworkChanged)
  render()
}

async function fetchArchives () {
  archives = await beaker.archives.list({isSaved: true})
  archives = archives.filter(a => a.userSettings.networked)
}

// events
// =

async function onNetworkChanged ({details}) {
  // console.log(details)
  var archive = archives.find(a => details.url === a.url)
  if (archive) archive.peers = details.peerCount
  if (archive) console.log(archive.title, archive.peers)
  render()
}

async function onToggleHosting (archive) {
  var isNetworked = !archive.userSettings.networked

  // don't unsave the archive if user is owner
  if (archive.isOwner) {
    var tmpArchive = new DatArchive(archive.url)
    await tmpArchive.configure({networked: isNetworked})
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

// rendering
// =

function render () {
  yo.update(document.querySelector('.network-wrapper'), yo`
    <div class="network-wrapper builtin-wrapper">
      ${renderSidebar('network')}
      <div>
        <div class="builtin-sidebar">
          <h1>Network Activity</h1>
        </div>

        <div class="builtin-main">
          <div class="view">${renderArchives()}</div>
        </div>
      </div>
    </div>
  </div>`)
}

function renderArchives () {
  return yo`
    <ul class="archives">${archives.map(renderArchive)}</ul>
  `
}

function renderArchive (archive) {
  return yo`
    <li class="archive">
      <div class="header">
        <img class="favicon" src="beaker-favicon:${archive.url}" />

        <div>
          <a href=${archive.url} class="title">
            ${archive.title || yo`<em>Untitled</em>`}
          </a>

          <div class="metadata">
            ${archive.peers} ${pluralize(archive.peers, 'peer')}
            •
            ${prettyBytes(archive.size)}
          </div>
        </div>
      </div>

      <p class="desc">${archive.description || yo`<em>No description</em>`}</p>

      <button class="btn hosting-btn" onclick=${e => onToggleHosting(archive)}>
        ${archive.userSettings.networked
          ? yo`
            <span>
              Stop seeding
              <span class="square"></span>
            </span>`
          : yo`
            <span>
              Start seeding
              <span class="plus">+</span>
            </span>`
        }
      </button>
    </li>
  `
}
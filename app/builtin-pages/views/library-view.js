/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FSArchive} from 'beaker-virtual-fs'
import FilesBrowser from '../com/files-browser2'
import * as toast from '../com/toast'
import {pluralize, shortenHash} from '../../lib/strings'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// globals
// =

var activeView = 'files'
var archive
var archiveInfo
var archiveFsRoot
var filesBrowser
var error

// main
// =

setup()
async function setup () {
  // try {
    // load data
    let url = window.location.pathname.slice(1)
    archive = new DatArchive(url)
    archiveInfo = await archive.getInfo()
    archiveFsRoot = new FSArchive(null, archiveInfo)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource
    await readSelectedPathFromURL()

    document.title = `Library - ${archiveInfo.title || 'Untitled'}`

    // wire up events
    window.addEventListener('popstate', onPopState)
  // } catch (e) {
  //   error = e
  // }

  render()
}

// rendering
// =

function render () {
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper library-view builtin-wrapper">
        <div class="builtin-main" style="margin-left: 0; width: 100%">
          <div class="builtin-header">
            <div class="container">
              ${renderInfo()}
              ${renderTabs()}
            </div>
          </div>

          <div class="container">${renderView()}</div>

          ${error ? error.toString() : ''}
        </div>
      </div>
    `
  )
}

function renderView () {
  switch (activeView) {
    case 'files':
      return renderFilesView()
    case 'settings':
      return renderSettingsView()
    default:
      return yo`<div class="view">Loading...</div>`
  }
}

function renderFilesView () {
  return yo`
    <div class="view files">
      ${filesBrowser ? filesBrowser.render() : ''}
    </div>
  `
}

function renderSettingsView () {
  return yo`
    <div class="settings view">
      <h2>Settings</h2>
    </div>
  `
}

function renderInfo () {
  return yo`
    <div class="info-container">
      <div class="info">
        <a href=${archiveInfo.url} class="title">
          ${archiveInfo.title || 'Untitled'}
        </a>

        <p class="description">
          ${archiveInfo.description || yo`<em>No description</em>`}
        </p>
      </div>

      ${renderActions()}

      ${renderMetadata()}
    </div>
  `
}

function renderTabs () {
  return yo`
    <div class="tabs">
      <div onclick=${e => onChangeView('files')} class="tab ${activeView === 'files' ? 'active' : ''}">
        <i class="fa fa-code"></i>
        Files
      </div>

      <div onclick=${e => onChangeView('settings')} class="tab ${activeView === 'settings' ? 'active' : ''}">
        <i class="fa fa-cogs"></i>
        Settings
      </div>
    </div>
  `
}

function renderMetadata () {
  return yo`
    <div class="metadata">
      <div>${prettyBytes(archiveInfo.size)}</div>

      <span class="separator">―</span>

      <div>${archiveInfo.peers} ${pluralize(archiveInfo.peers, 'peer')}</div>

      <span class="separator">―</span>

      <div class="url-info">
        <a href=${archiveInfo.url} class="url">
          ${shortenHash(archiveInfo.url)}
        </a>
      </div>
    </div>
  `

}

function renderActions () {
  return yo`
    <div class="actions">
      <button class="btn transparent">
        <i class="fa fa-ellipsis-v"></i>
      </button>
    </div>
  `
}

// events
// =

function onChangeView (view) {
  activeView = view
  render()
}

function onChangeMode (mode) {
  activeMode = mode
  render()
}

async function onSetCurrentSource (node) {
  let path = archive.url
  if (node._path) {
    path += node._path
  }

  // if it's a file, load the preview
  if (node.type === 'file') {
    await node.readData()
  }

  window.history.pushState('', {}, `beaker://library/${path}`)
}

function onCopyUrl () {
  if (archiveInfo) {
    writeToClipboard(archiveInfo.url)
    toast.create('URL copied to clipboard')
  }
}

function onPopState (e) {
  readSelectedPathFromURL()
}

// helpers
// =

async function readSelectedPathFromURL () {
  try {
    var node
    var urlp = new URL(window.location.pathname.slice(1))
    var pathParts = urlp.pathname.split('/').filter(Boolean)

    // select the archive
    node = archiveFsRoot
    await node.readData()

    // now select the folders
    let pathPart
    while ((pathPart = pathParts.shift())) {
      node = node.children.find(node => node.name === pathPart)
      await node.readData()
    }

    await filesBrowser.setCurrentSource(node, {suppressEvent: true})
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}
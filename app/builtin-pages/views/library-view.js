/* globals DatArchive beaker */

import yo from 'yo-yo'
import _get from 'lodash.get'
import {FSArchive} from 'beaker-virtual-fs'
import FilesBrowser from '../com/files-browser2'
import {shortenHash} from '../../lib/strings'

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
        <img src="beaker-favicon:${archiveInfo.url}" class="favicon"/>
        <a href=${archiveInfo.url} class="title">
          ${_get(archiveInfo, 'title', 'Untitled')}
        </a>

        <div>
          <p class="description">
            ${_get(archiveInfo, 'description', yo`<em>No description</em>`)}
          </p>
        </div>
      </div>

      ${renderActions()}
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

function onSetCurrentSource (node) {
  let path = archive.url
  if (node._path) {
    path += node._path
  }
  window.history.pushState('', {}, `beaker://library/${path}`)
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
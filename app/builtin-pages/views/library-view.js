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
var archiveFs
var filesBrowser
var error

// main
// =

setup()
async function setup () {
  // try {
    let url = window.location.pathname.slice(1)
    archive = new DatArchive(url)
    archiveInfo = await archive.getInfo()
    archiveFs = new FSArchive(null, archiveInfo)
    await archiveFs.readData()
    filesBrowser = new FilesBrowser(archiveFs)
    filesBrowser.onSetCurrentSource = console.log
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
          <div class="builtin-header fixed">
            <div class="container">
              ${renderInfo()}
              ${renderTabs()}
            </div>
          </div>

          ${error ? error.toString() : ''}
          ${filesBrowser ? filesBrowser.render() : ''}
        </div>
      </div>
    `
  )
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

          <a href=${archiveInfo.url} class="url">
            ${shortenHash(archiveInfo.url)}
          </a>
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

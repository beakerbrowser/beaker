/* globals DatArchive beaker hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import toggleable from '../com/toggleable'
import FileTree from '../com/editor/file-tree'
import * as models from '../com/editor/models'

const DAT_KEY = 'da47297fc3b933f6241ba82ddd1800ad210484010cd8179bbfa8963de95ad6c5'
var archive
var workingCheckout
var archiveFsRoot
var fileTree
var isHistoricalVersion = false

async function setupWorkingCheckout () {
  var vi = archive.url.indexOf('+')
  if (vi !== -1) {
    if (archive.url.endsWith('+latest')) {
      // HACK
      // use +latest to show latest
      // -prf
      workingCheckout = new Archive(archive.checkout().url)
    } else {
      // use given version
      workingCheckout = archive
    }

    var version = archive.url.slice(vi + 1)
    // is the version a number?
    if (version == +version) {
      isHistoricalVersion = true
    }
  } else if (_get(archive, 'info.userSettings.previewMode') && _get(archive, 'info.userSettings.isSaved')) {
    // HACK
    // default to showing the preview when previewMode is on, even if +preview isnt set
    // -prf
    workingCheckout = new Archive(archive.checkout('preview').url)
  } else {
    // use latest checkout
    workingCheckout = new Archive(archive.checkout().url)
  }
  await workingCheckout.setup()
}

setup()
async function setup () {
  // load the archive
  console.log('Loading', DAT_KEY)
  archive = new Archive(DAT_KEY)
  await archive.setup()
  await setupWorkingCheckout()

  // load the archiveFS
  archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
  fileTree = new FileTree(archiveFsRoot)
  await fileTree.setCurrentSource(archiveFsRoot)

  //archive.on('changed', onArchiveChanged)

  render()

  // debug
  window.models = models
  window.archive = archive
}

function render () {
  // toolbar
  /*yo.update(
    document.querySelector('.editor-toolbar'), yo`
      <div class="editor-toolbar">
        ${renderToolbar()}
      </div>
    `
  )*/

  console.log(archive)

  // nav
  yo.update(
    document.querySelector('.editor-explorer'),
    yo`
      <div class="editor-explorer">
        <div class="explorer-title">Explorer</div>
        <div class="explorer-section">
          <span class="section-title">
            <i class="fa fa-caret-right"></i>
            beakerbrowser.com
          </span>
          ${fileTree ? fileTree.render() : ''}
        </div>
      </div>
    `
  )

  // tabs
  yo.update(
    document.querySelector('.editor-tabs'),
    yo`
      <div class="editor-tabs">
        <div class="tab active">
          untitled
          <i class="fa fa-times"></i>
        </div>
      </div>
    `
  )

  /*yo.update(
    document.querySelector('.header'),
    yo`<div class="header">
      <div class="btn" onclick=${onSave}><span class="icon icon-floppy"></span> Save</div>
      <div class="sep"></div>
      <div class="file-info">
        index.html
        ${models.getActive()
          ? yo`<span class="muted thin">${models.getActive().lang}</span>`
          : ''}
      </div>
      <div class="flex-fill"></div>
      <div class="sep"></div>
      <div class="btn" onclick=${onFork}><span class="icon icon-flow-branch"></span> Fork</div>
      <div class="sep"></div>
      <div class="btn" onclick=${onAboutSite}><span class="icon icon-info"></span> About Site</div>
      <div class="sep"></div>
      <div class="btn" onclick=${onOpenInNewWindow}><span class="icon icon-popup"></span> Open</div>
    </div>`
  )*/
}

/*function renderToolbar() {
  return yo`
    ${toggleable(yo`
      <div class="toolbar-item toggleable-container">
        <span class="toggleable" data-toggle-on="mouseover">File</span>
        <div class="toolbar-items subtle-shadow left">
          <div class="item" onclick=${() => onCreateSite()}>
            <div class="label">
              New File
            </div>
          </div>
          <div class="item" onclick=${() => onCreateSite()}>
            <div class="label">
              New Editor Window
            </div>
          </div>
        </div>
      </div>
    `)}
    ${toggleable(yo`
      <div class="toolbar-item toggleable-container">
        <span class="toggleable" data-toggle-on="mouseover">Edit</span>
        <div class="toolbar-items subtle-shadow left">
          <div class="item" onclick=${() => onCreateSite()}>
            <div class="label">
              New File
            </div>
          </div>
          <div class="item" onclick=${() => onCreateSite()}>
            <div class="label">
              New Editor Window
            </div>
          </div>
        </div>
      </div>
    `)}
  `
}*/

/*window.addEventListener('editor-created', () => {
  models.setActive(fileTree.getCurrentSource(), 'index.html')
})*/

window.addEventListener('open-file', e => {
  models.setActive(archive, e.detail.path)
})

window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.keyCode === 83/*'S'*/) {
    onSave()
    e.preventDefault()
  }
})

window.addEventListener('set-active-model', render)
window.addEventListener('model-dirtied', render)
window.addEventListener('model-cleaned', render)

function onSave () {
  models.save(archive, archive.files.currentNode.entry.path)
}

function onFork () {
  beaker.openUrl(`beaker:library/${DAT_KEY}#fork`)
}

function onAboutSite () {
  beaker.openUrl(`beaker:library/${DAT_KEY}`)
}

function onOpenInNewWindow () {
  const active = models.getActive()
  if (!active) return
  beaker.openUrl(`dat://${DAT_KEY}/${active.path}`)
}

function onArchiveChanged () {
  const activeModel = models.getActive()
  if (!activeModel) return
  archive.files.setCurrentNodeByPath(activeModel.path, {allowFiles: true})
  render()
}
/* globals DatArchive beaker localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import toggleable from '../com/toggleable'
import FileTree from '../com/editor/file-tree'
import * as models from '../com/editor/models'

var archive
var lastUrl
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
  // load data
  let url = await parseLibraryUrl()

  // if opening
  loadState()
  if (lastUrl === url) {
    archive = new Archive(lastUrl)
    await archive.setup()
    await setupWorkingCheckout()

    models.loadModels(archive, JSON.parse(localStorage.getItem('models')))
  } else if (url) {
    archive = new Archive(url)
    await archive.setup()
    await setupWorkingCheckout()
  }

  if (archive) {
    // load the archiveFS
    archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
    fileTree = new FileTree(archiveFsRoot)
    await fileTree.setCurrentSource(archiveFsRoot)

    saveState()
  }

  document.title = `Editor - ${_get(archive, 'info.title', 'Untitled')}`

  render()
}

function loadState () {
  lastUrl = localStorage.getItem('lastUrl') || null
}

function saveState () {
  localStorage.setItem('lastUrl', archive.url)
}

function render () {
  // explorer/file tree
  yo.update(
    document.querySelector('.editor-explorer'),
    yo`
      <div class="editor-explorer">
        <div class="explorer-title">Explorer</div>
        <div class="explorer-section">
          <span class="section-title" onclick=${toggleFileTree}>
            <i class="fa fa-caret-down"></i>
            <span>${_get(archive, 'info.title', 'Untitled')}</span>
            <div class="archive-fs-options">
              <i class="fa fa-sync-alt"></i>
              <i class="fa fa-plus-square"></i>
              <i class="fa fa-folder-plus"></i>
            </div>
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
        ${models.getModels().map(model => renderTabs(model))}
      </div>
    `
  )
}

window.addEventListener('editor-created', () => {
  if (archive) {
    let showDefaultFile = archiveFsRoot._files.find(v => {
      return v.name === 'index.html'
    })
    models.setActive(showDefaultFile)
  }
})

window.addEventListener('open-file', e => {
  models.setActive(e.detail.path)
})

window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.keyCode === 83/*'S'*/) {
    onSave()
    e.preventDefault()
  }
})

window.addEventListener('update-editor', updateEditor)
window.addEventListener('model-dirtied', render)
window.addEventListener('model-cleaned', render)

function renderTabs (model) {
  let cls = models.getActive() === model ? 'active' : ''
  return yo`
    <div class="tab ${cls}" onclick=${() => models.setActive(model)}>
      ${model.name}
      <i class="fa fa-times" onclick=${(e) => models.unload(e, model)}></i>
    </div>
  `
}
async function parseLibraryUrl () {
  return window.location.pathname.slice(1)
}

function updateEditor () {
  saveState()
  render()
}

function toggleFileTree () {
  let fileTree = document.querySelector('.filetree')
  let icon = document.querySelector('.section-title i')
  icon.classList.contains('fa-caret-down') ? icon.classList.replace('fa-caret-down', 'fa-caret-right') : icon.classList.replace('fa-caret-right', 'fa-caret-down')
  fileTree.classList.toggle('hidden')
}

function onSave () {
  models.save(archive, archive.files.currentNode.entry.path)
}
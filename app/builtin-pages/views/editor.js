/* globals DatArchive beaker monaco editor diffEditor localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import FileTree from '../com/editor/file-tree'
import * as models from '../com/editor/models'

var archive
var workingCheckout
var archiveFsRoot
var fileTree
var fileDiffs
var isHistoricalVersion = false

// which should we use in keybindings?
var osUsesMetaKey = false

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

async function setup () {
  // load data
  let url = await parseLibraryUrl()
  let browserInfo = beaker.browser.getInfo()
  osUsesMetaKey = browserInfo.platform === 'darwin'

  if (url) {
    archive = new Archive(url)
    await archive.setup()
    await setupWorkingCheckout()

    // load the archiveFS
    archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
    fileTree = new FileTree(archiveFsRoot)
    await fileTree.setCurrentSource(archiveFsRoot)

    // ready archive diff
    await localCompare()

    let showDefaultFile = archiveFsRoot._files.find(v => {
      return v.name === 'index.html'
    })
    console.log(showDefaultFile)
    models.setActive(showDefaultFile)

    document.title = `Editor - ${_get(archive, 'info.title', 'Untitled')}`
  } else {
    let untitled = monaco.editor.createModel('')
    untitled.name = 'untitled'
    untitled.isEditable = true
    editor.setModel(untitled)
  }

  render()
}

function render () {
  // explorer/file tree
  if (archive && workingCheckout.info.userSettings.previewMode) {
    yo.update(
      document.querySelector('.editor-explorer'),
      yo`
        <div class="editor-explorer">
          <div class="explorer-title">Explorer</div>
          <div class="explorer-section">
            <span class="section-title" id="filetree" onclick=${() => toggleFileTree('filetree')}>
              <i class="fa fa-caret-down"></i>
              <span>${_get(archive, 'info.title', 'Untitled')}</span>
              <div class="archive-fs-options">
                <i class="fa fa-sync-alt"></i>
                <i class="fa fa-plus-square"></i>
                <i class="fa fa-folder-plus"></i>
              </div>
            </span>
            ${fileTree ? fileTree.render() : ''}
            <span class="section-title" id="difftree" onclick=${() => toggleFileTree('difftree')}>
              <i class="fa fa-caret-down"></i>
              <span>Preview Changes</span>
              <div class="archive-fs-options">
                <i class="fa fa-sync-alt"></i>
                <i class="fa fa-plus-square"></i>
                <i class="fa fa-folder-plus"></i>
              </div>
            </span>
            ${renderDiffTree()}
          </div>
        </div>
      `)
  } else if (archive) {
    yo.update(
      document.querySelector('.editor-explorer'),
      yo`
        <div class="editor-explorer">
          <div class="explorer-title">Explorer</div>
          <div class="explorer-section">
            <span class="section-title" id="filetree" onclick=${() => toggleFileTree('filetree')}>
              <i class="fa fa-caret-down"></i>
              <span>${_get(archive, 'info.title', 'Untitled')}</span>
              <div class="archive-fs-options">
                <i class="fa fa-sync-alt"></i>
                <i class="fa fa-plus-square"></i>
                <i class="fa fa-folder-plus"></i>
              </div>
            </span>
            ${fileTree ? fileTree.render() : ''}
        `
      )
  } else {
    yo.update(
      document.querySelector('.editor-explorer'),
      yo`
        <div class="editor-explorer">
          <button>Open dat archive</button>
        </div>
      `
    )
  }
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

window.addEventListener('editor-created', setup)

window.addEventListener('keydown', e => {
  var ctrlOrMeta = osUsesMetaKey ? e.metaKey : e.ctrlKey
  // cmd/ctrl + s
  if (ctrlOrMeta && e.keyCode == 83) {
    onSave()
    e.preventDefault()
  }
})

window.addEventListener('update-editor', render)
window.addEventListener('model-dirtied', render)
window.addEventListener('model-cleaned', render)

function renderTabs (model) {
  let cls = models.getActive() === model ? 'active' : ''
  return yo`
    <div draggable="true" class="tab ${cls}" onclick=${() => models.setActive(model)}>
      ${model.name}
      <i class="fa fa-times" onclick=${(e) => models.unload(e, model)}></i>
    </div>
  `
}

function renderDiffTree () {
  if (!workingCheckout.info.userSettings.previewMode) return

  return yo`
    <div class="difftree">
      ${fileDiffs.map(v => render(v))}
    </div>
  `

  function render (v) {
    console.log(v)
    return yo`
      <div
        class="item file"
        title=${v.name}
        onclick=${e => onClickDiff(e, v)}
      >
        <i class="fas fa-code-branch"></i>
        <span>${v.name}</span>
      </div>
    `
  }
}

async function localCompare () {
  let compareDiff = await beaker.archives.diffLocalSyncPathListing(archive.url, {compareContent: true, shallow: true})
  let archiveFS = new FSArchive(null, archive, archive.info)
  await archiveFS.readData()

  compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))

  fileDiffs = []

  for (let diff of compareDiff) {
    let name = diff.path.match(/[^/]+$/).pop()
    let original = archiveFS._files.find(v => v.name == name)
    let modified = archiveFsRoot._files.find(v => v.name == name)

    if (!original && !modified) return
    await original.readData()
    await modified.readData()

    // set diff
    diff.name = name
    diff.diff = await beaker.archives.diffLocalSyncPathFile(archive.url, diff.path)
    diff.original = monaco.editor.createModel(original.preview)
    diff.modified = monaco.editor.createModel(modified.preview)
    fileDiffs.push(diff)
  }
  console.log(fileDiffs)
}

async function parseLibraryUrl () {
  return window.location.pathname.slice(1)
}

function toggleFileTree (tree) {
  let fileTree = document.querySelector('.' + tree)
  let icon = document.querySelector('#' + tree + ' i')
  icon.classList.contains('fa-caret-down') ? icon.classList.replace('fa-caret-down', 'fa-caret-right') : icon.classList.replace('fa-caret-right', 'fa-caret-down')
  fileTree.classList.toggle('hidden')
}

function onClickDiff (e, diff) {
  document.querySelector('#diffEditor').style.display = 'block'
  document.querySelector('#editor').style.display = 'none'

  diffEditor.setModel({
    original: diff.original,
    modified: diff.modified
  })
}

function onSave () {
  models.save(archive, archive.files.currentNode.entry.path)
}
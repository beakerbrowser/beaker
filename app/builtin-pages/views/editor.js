/* globals DatArchive beaker monaco editor diffEditor localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import * as fileTree from '../com/editor/file-tree'
import * as models from '../com/editor/models'
import * as toast from '../com/toast'

var archive
var workingCheckout
var archiveFsRoot
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
    await fileTree.setCurrentSource(archiveFsRoot)

    // set preview mode for file tree
    fileTree.setPreviewMode(archive.info.userSettings.previewMode)

    let fileActStream = archive.watch()
    fileActStream.addEventListener('changed', onFilesChanged)
    if (_get(archive, 'info.userSettings.previewMode')) {
      fileActStream = workingCheckout.watch()
      fileActStream.addEventListener('changed', onFilesChanged)
    }

    let showDefaultFile = archiveFsRoot._files.find(v => {
      return v.name === 'index.html'
    })
    models.setActive(showDefaultFile)

    document.title = `Editor - ${_get(archive, 'info.title', 'Untitled')}`
  } else {
    let untitled = monaco.editor.createModel('')
    untitled.name = 'untitled'
    untitled.isEditable = true
    editor.setModel(untitled)
  }

  // ready archive diff
  if (workingCheckout.info.userSettings.previewMode) await localCompare()

  render()
}

function render () {
  // explorer/file tree
  // workingCheckout.info.userSettings.previewMode
  if (archive) {
    yo.update(
      document.querySelector('.editor-explorer'),
      yo`
        <div class="editor-explorer">
          <div class="explorer-title">Explorer</div>
          ${fileTree.render()}
        </div>
      `)
  } else {
    yo.update(
      document.querySelector('.editor-explorer'),
      yo`
        <div class="editor-explorer">
          <button class="btn primary">Open dat archive</button>
        </div>
      `
    )
  }
  // tabs
  yo.update(
    document.querySelector('.editor-tabs'),
    yo`
      <div class="editor-tabs">
        ${models.getModels().map(model => renderTab(model))}
      </div>
    `
  )
}

window.addEventListener('editor-created', setup)

window.addEventListener('keydown', e => {
  var ctrlOrMeta = osUsesMetaKey ? e.metaKey : e.ctrlKey
  // cmd/ctrl + s
  if (ctrlOrMeta && e.keyCode == 83) {
    e.preventDefault()
    e.stopPropagation()

    onSave()
  }
})

window.addEventListener('update-editor', render)
window.addEventListener('model-dirtied', render)
window.addEventListener('model-cleaned', render)

function renderTab (model) {
  let cls = models.getActive() === model ? 'active' : ''
  return yo`
    <div draggable="true" class="tab ${cls}" onclick=${() => models.setActive(model)}>
      ${model.name}
      <i class="fa fa-times" onclick=${(e) => models.unload(e, model)}></i>
    </div>
  `
}

async function localCompare () {
  let compareDiff = await beaker.archives.diffLocalSyncPathListing(archive.url, {compareContent: true, shallow: true})
  let archiveFS = new FSArchive(null, archive, archive.info)
  await archiveFS.readData()

  fileTree.clearFileDiffs()

  compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))

  for (let diff of compareDiff) {
    let name = diff.path.match(/[^/]+$/).pop().replace("\\", "")
    let original = archiveFS._files.find(v => v.name == name)
    let modified = archiveFsRoot._files.find(v => v.name == name)

    if (!original || !modified) return
    await original.readData()
    await modified.readData()

    // set diff
    diff.name = name + ' (Working Checkout)'
    diff.original = original.preview
    diff.modified = modified.preview
    fileTree.setFileDiffs(diff)
  }
}

async function parseLibraryUrl () {
  return window.location.pathname.slice(1)
}

async function onFilesChanged () {
  await localCompare()
  fileTree.rerender()
}

async function onSave () {
  try {
    let model = models.getActive()
    let fileContent = model.getValue()
    let fileName = model.name
    let filePath = model.uri.path
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }

    await workingCheckout.writeFile(filePath, fileContent, 'utf8')

    toast.create('Saved', 'success')
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}
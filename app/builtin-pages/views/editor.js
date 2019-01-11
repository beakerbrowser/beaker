/* globals DatArchive beaker monaco editor diffEditor localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import * as fileTree from '../com/editor/file-tree'
import * as models from '../com/editor/models'
import * as toast from '../com/toast'
import toggleable2, {closeAllToggleables}  from '../com/toggleable2'
import renderFaviconPicker from '../com/settings/favicon-picker'
import renderArchiveHistory from '../com/archive/archive-history'

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
  const isOwner = _get(archive, 'info.isOwner')
  const previewMode = _get(archive, 'info.userSettings.previewMode')
  const currentFaviconUrl = `beaker-favicon:32,${archive.url}`
  var version = 'latest'
  var filePath = '/' + window.location.pathname.split('/').slice(4).join('/')

  var vi = workingCheckout.url.indexOf('+')
  if (vi !== -1) {
    version = workingCheckout.url.slice(vi + 1)
  }

  // is the version a number?
  if (version == +version) version = `v${version}`

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

  // toolbar
  yo.update(
    document.querySelector('.editor-toolbar'),
    yo`
      <div class="editor-toolbar">
        ${isOwner
          ? yo`
            <p>
              ${toggleable2({
                id: 'favicon-picker',
                closed: ({onToggle}) => yo`
                  <div class="dropdown toggleable-container">
                    <span class="version-picker-btn" onclick=${onToggle}>Version: ${version}</span>
                  </div>`,
                open: ({onToggle}) => yo`
                  <div class="dropdown toggleable-container">
                    <span class="version-picker-btn pressed" onclick=${onToggle}>Version: ${version}</span>
                    <div class="dropdown-items subtle-shadow left" onclick=${onToggle}>
                      ${renderArchiveHistory(workingCheckout, {filePath, includePreview: previewMode})}
                    </div>
                  </div>`
              })}
            </p>`
            : yo``
        }
        ${isOwner
          ? yo`
            <p>
              ${toggleable2({
                id: 'favicon-picker',
                closed: ({onToggle}) => yo`
                  <div class="dropdown toggleable-container">
                    <span class="favicon-picker-btn" onclick=${onToggle}>Favicons</span>
                  </div>`,
                open: ({onToggle}) => yo`
                  <div class="dropdown toggleable-container">
                    <span class="favicon-picker-btn pressed" onclick=${onToggle}>Favicons</span>
                    <div class="dropdown-items subtle-shadow right" onclick=${onToggle}>
                      ${renderFaviconPicker({onSelect: onSelectFavicon, currentFaviconUrl})}
                    </div>
                  </div>`
              })}
            </p>`
            : yo``
        }
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
    let name = diff.path.match(/[^/]+$/).pop().replace('\\', '')
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
  await fileTree.setCurrentSource(archiveFsRoot)
  await localCompare()
  fileTree.rerender()
}

async function onSelectFavicon (imageData) {
  let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
  if (imageData) {
    await archive2.writeFile('/favicon.ico', imageData)
  } else {
    await archive2.unlink('/favicon.ico').catch(e => null)
    await beaker.sitedata.set(archive.url, 'favicon', '') // clear cache
  }
  closeAllToggleables()
  //render() will need to call this once we get the archive change issues fixed. That way the favicon will be updated whenever you open it.
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

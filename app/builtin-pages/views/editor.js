/* globals DatArchive beaker monaco editor diffEditor localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import * as sidebar from '../com/editor/sidebar'
import * as tabs from '../com/editor/tabs'
import * as models from '../com/editor/models'
import * as toast from '../com/toast'
import {closeAllToggleables}  from '../com/toggleable2'
import renderFaviconPicker from '../com/settings/favicon-picker'

const DEFAULT_SIDEBAR_WIDTH = 200
const MIN_SIDEBAR_WIDTH = 100

var archive
var workingCheckout
var archiveFsRoot
var isHistoricalVersion = false

var sidebarWidth
var isDraggingSidebar = false

// which should we use in keybindings?
var osUsesMetaKey = false

// setup
// =

window.addEventListener('editor-created', setup)

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

  // bind events
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('editor-rerender', update)
  document.addEventListener('editor-model-dirtied', update)
  document.addEventListener('editor-model-cleaned', update)
  document.addEventListener('editor-set-active', onSetActive)
  document.addEventListener('editor-unload-model', onUnloadModel)
  document.addEventListener('editor-unload-all-models-except', onUnloadAllModelsExcept)
  document.addEventListener('editor-unload-all-models', onUnloadAllModels)
  document.addEventListener('editor-reorder-models', onReorderModels)
  document.addEventListener('editor-create-folder', onCreateFolder)
  document.addEventListener('editor-create-file', onCreateFile)
  document.addEventListener('editor-rename-file', onRenameFile)
  document.addEventListener('editor-delete-file', onDeleteFile)

  // setup the sidebar resizer
  setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
  var sidebarDragHandleEl = document.querySelector('#editor-sidebar-drag-handle')
  sidebarDragHandleEl.addEventListener('mousedown', onMousedownSidebarDragHandle)
  document.addEventListener('mouseup', onGlobalMouseup)
  document.addEventListener('mousemove', onGlobalMousemove)

  if (url) {
    ;archive = new Archive(url)
    await archive.setup()
    await setupWorkingCheckout()

    // load the archiveFS
    archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
    await sidebar.setCurrentSource(archiveFsRoot)

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

  update()
}

async function localCompare () {
  let compareDiff = await beaker.archives.diffLocalSyncPathListing(archive.url, {compareContent: true, shallow: true})

  const checkNode = async (node) => {
    // check for diff
    var diff = compareDiff.find(diff => diff.path === node._path)
    node.change = diff ? diff.change : false

    // recurse
    if (node.isContainer) {
      for (let c of node.children) {
        await checkNode(c)
      }
    }
  }
  await checkNode(archiveFsRoot)
  await sidebar.rerender()
}

async function parseLibraryUrl () {
  return window.location.pathname.slice(1)
}

function setSidebarWidth (width) {
  sidebarWidth = width

  var actualWidth = getActualSidebarWidth()
  if (actualWidth === 0) {
    document.querySelector('#editor-sidebar-drag-handle').classList.add('wide')
  } else {
    document.querySelector('#editor-sidebar-drag-handle').classList.remove('wide')
  }

  const setWidth = (sel, v) => {
    /** @type HTMLElement */(document.querySelector(sel)).style.width = v
  }
  setWidth('.editor-sidebar', `${actualWidth}px`)
  setWidth('.editor-container', `calc(100vw - ${actualWidth}px)`) // allows monaco to resize properly
}

function getActualSidebarWidth () {
  // if the width gets under the minimum, just hide
  return (sidebarWidth > MIN_SIDEBAR_WIDTH) ? sidebarWidth : 0
}

// rendering
// =

function update () {
  // sidebar
  if (archive) {
    yo.update(
      document.querySelector('.editor-sidebar'),
      yo`
        <div class="editor-sidebar" style="width: ${getActualSidebarWidth()}px">
          ${sidebar.render()}
        </div>
      `)
  } else {
    yo.update(
      document.querySelector('.editor-sidebar'),
      yo`
        <div class="editor-sidebar" style="width: ${getActualSidebarWidth()}px">
          <button class="btn primary">Open dat archive</button>
        </div>
      `
    )
  }
  // tabs
  yo.update(document.querySelector('.editor-tabs'), tabs.render(models.getModels()))
}


// event handlers
// =

function onMousedownSidebarDragHandle (e) {
  isDraggingSidebar = true
}

function onGlobalMouseup (e) {
  isDraggingSidebar = false
}

function onGlobalMousemove (e) {
  if (!isDraggingSidebar) return
  setSidebarWidth(e.clientX)
}

function onBeforeUnload (e) {
  if (models.checkForDirtyFiles()) {
    e.returnValue = 'You have unsaved changes, are you sure you want to leave?'
  }
}

function onGlobalKeydown (e) {
  var ctrlOrMeta = osUsesMetaKey ? e.metaKey : e.ctrlKey
  // cmd/ctrl + s
  if (ctrlOrMeta && e.keyCode == 83) {
    e.preventDefault()
    e.stopPropagation()

    onSave()
  }
}

async function onFilesChanged () {
  await sidebar.setCurrentSource(archiveFsRoot)
  await localCompare()
  sidebar.rerender()
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


function onSetActive (e) {
  models.setActive(e.detail.model)
}

function onUnloadModel (e) {
  models.unload(e.detail.model)
}

function onUnloadAllModelsExcept (e) {
  models.unloadOthers(e.detail.model)
}

function onUnloadAllModels (e) {
  models.unloadAllModels()
}

function onReorderModels (e) {
  models.reorderModels(e.detail.srcModel, e.detail.dstModel)
}

async function onCreateFile (e) {
  try {
    const {path} = e.detail
    const to = setTimeout(() => toast.create('Saving...'), 500) // if it takes a while, toast
    await workingCheckout.writeFile(path, '')
    clearTimeout(to)

    // TODO open the new file
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

async function onCreateFolder (e) {
  try {
    const {path} = e.detail
    const to = setTimeout(() => toast.create('Saving...'), 500) // if it takes a while, toast
    await workingCheckout.mkdir(path)
    clearTimeout(to)
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

async function onRenameFile (e) {
  try {
    const {path, newName} = e.detail
    const to = setTimeout(() => toast.create('Renaming...'), 500) // if it takes a while, toast
    const newPath = path.split('/').slice(0, -1).concat(newName).join('/')
    await workingCheckout.rename(path, newPath)
    clearTimeout(to)
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

async function onDeleteFile (e) {
  try {
    const {path, isFolder} = e.detail
    const to = setTimeout(() => toast.create('Deleting...'), 500) // if it takes a while, toast

    if (isFolder) {
      await workingCheckout.rmdir(path, {recursive: true})
    } else {
      await workingCheckout.unlink(path)
    }

    clearTimeout(to)
    toast.create(`Deleted ${path}`)
    update()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
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

    models.setVersionIdOnSave(model)
    await workingCheckout.writeFile(filePath, fileContent, 'utf8')

    toast.create('Saved', 'success')
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}


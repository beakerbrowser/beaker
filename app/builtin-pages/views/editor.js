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
import * as contextMenu from '../com/context-menu'

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
  window.addEventListener('update-editor', render)
  window.addEventListener('model-dirtied', render)
  window.addEventListener('model-cleaned', render)
  document.body.addEventListener('custom-rename-file', onRenameFile)
  document.body.addEventListener('custom-delete-file', onDeleteFile)

  // setup the sidebar resizer
  setSidebarWidth(250)
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

async function localCompare () {
  let compareDiff = await beaker.archives.diffLocalSyncPathListing(archive.url, {compareContent: true, shallow: true})
  let archiveFS = new FSArchive(null, archive, archive.info)
  await archiveFS.readData()

  compareDiff.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
  let fileDiffs = await Promise.all(compareDiff.map(async (diff) => {
    let node, obj
    if (diff.change !== 'del') {
      node = await findArchiveNode(archiveFsRoot, diff.path)
      obj = Object.create(node)
      obj.original = await findArchiveNode(archiveFS, diff.path)
      obj.isDiff = true
      obj.change = diff.change
    } else if (diff.change == 'del') {
      node = await findArchiveNode(archiveFS, diff.path)
      obj = Object.create(node)
      obj.isDiff = true
      obj.change = diff.change
    }
    return obj
  }))

  fileTree.setFileDiffs(fileDiffs)
}

async function findArchiveNode (node, path) {
  var pathParts = path.split(/[\\\/]/g)
  for (let filename of pathParts) {
    if (filename.length === 0) continue // first item in array might be empty
    if (!node.isContainer) return null // node not found (we ran into a file prematurely)
    if (node._files.length === 0) await node.readData() // read the directory as needed
    node = node._files.find(n => n.name === filename) // move to next child in the tree
  }
  return node
}

async function parseLibraryUrl () {
  return window.location.pathname.slice(1)
}

function setSidebarWidth (width) {
  sidebarWidth = width
  const setWidth = (sel, v) => {
    /** @type HTMLElement */(document.querySelector(sel)).style.width = v
  }
  setWidth('.editor-sidebar', `${width}px`)
  setWidth('.editor-container', `calc(100vw - ${width}px)`) // allows monaco to resize properly
}

// rendering
// =

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

  // sidebar
  if (archive) {
    yo.update(
      document.querySelector('.editor-sidebar'),
      yo`
        <div class="editor-sidebar" style="width: ${sidebarWidth}px">
          ${fileTree.render()}
        </div>
      `)
  } else {
    yo.update(
      document.querySelector('.editor-sidebar'),
      yo`
        <div class="editor-sidebar" style="width: ${sidebarWidth}px">
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
        <div class="unused-space"></div>
      </div>
    `
  )
}

function renderTab (model) {
  let cls = models.getActive() === model ? 'active' : ''
  return yo`
    <div
    draggable="true"
    class="tab ${cls}"
    oncontextmenu=${(e) => onContextmenuTab(e, model)}
    onmouseup=${(e) => onClickTab(e, model)}
    ondragstart=${(e) => onTabDragStart(e, model)}
    ondragend=${(e) => onTabDragEnd(e, model)}
    ondragover=${(e) => onTabDragOver(e, model)}
    ondrop=${(e) => onTabDragDrop(e, model)}
    >
      ${model.isDiff ? model.name + " (Working Tree)" : model.name}
      <i class="fa fa-times" onclick=${(e) => onCloseTab(e, model)}></i>
    </div>
  `
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

;function onBeforeUnload (e) {  
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

function onCloseTab (e, model) {
  e.preventDefault()
  e.stopPropagation()

  models.unload(model)
}

function onClickTab (e, model) {
  e.preventDefault()
  e.stopPropagation()

  if (e.which == 2) models.unload(model)
  else if (e.which == 1) models.setActive(model)
}

let dragSrcModel = null

function onTabDragStart (e, model) {
  if (models.getActive !== model) models.setActive(model)
  dragSrcModel = model

  e.dataTransfer.effectAllowed = 'move'
}

function onTabDragEnd () {
  render()
}

function onTabDragOver (e) {
  e.preventDefault()

  e.dataTransfer.dropEffect = 'move'
  return false
}

async function onTabDragDrop (e, model) {
  e.stopPropagation()

  if (dragSrcModel != model) {
    await models.reorderModels(dragSrcModel, model)
  }
  return false
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
    render()
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

async function onContextmenuTab (e, model) {
  e.preventDefault()
  e.stopPropagation()

  var items = []

  if (model.isEditable) {
    items = items.concat([
      {
        label: 'Close',
        click: async () => {
          models.unload(model)
        }
      },
      {
        label: 'Close Others',
        click: () => {
          models.unloadOthers(model)
        }
      },
      {
        label: 'Close All',
        click: () => {
          models.unloadAllModels()
        }
      }
    ])
  }

  contextMenu.create({
    x: e.clientX,
    y: e.clientY,
    items
  })
}

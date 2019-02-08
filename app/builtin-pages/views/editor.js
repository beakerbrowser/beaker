/* globals DatArchive beaker monaco editor diffEditor localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import * as hotkeys from '../com/editor/hotkeys'
import * as sidebar from '../com/editor/sidebar'
import * as tabs from '../com/editor/tabs'
import * as toolbar from '../com/editor/toolbar'
import * as models from '../com/editor/models'
import * as toast from '../com/toast'
import {closeAllToggleables}  from '../com/toggleable2'
import * as localSyncPathPopup from '../com/library/localsyncpath-popup'

const DEFAULT_SIDEBAR_WIDTH = 160
const MIN_SIDEBAR_WIDTH = 100

var archive
var workingCheckoutVersion
var workingCheckout
var archiveFsRoot
var currentDiff
var isReadonly

var sidebarWidth
var isDraggingSidebar = false

var OS_USES_META_KEY = false

// HACK
// Linux/Windows are not capable of importing folders and files in the same dialog
// unless we create our own import dialog (FFS!) we just need to change
// behavior based on which platform we're on. This flag tracks that.
// -prf
window.OS_CAN_IMPORT_FOLDERS_AND_FILES = true

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
      workingCheckoutVersion = 'latest'
    } else {
      // use given version
      workingCheckout = archive
    }

    workingCheckoutVersion = archive.url.slice(vi + 1)
  } else if (_get(archive, 'info.userSettings.previewMode') && _get(archive, 'info.userSettings.isSaved')) {
    // HACK
    // default to showing the preview when previewMode is on, even if +preview isnt set
    // -prf
    workingCheckout = new Archive(archive.checkout('preview').url)
    workingCheckoutVersion = 'preview'
  } else {
    // use latest checkout
    workingCheckout = new Archive(archive.checkout().url)
    workingCheckoutVersion = 'latest'
  }
  await workingCheckout.setup()
  console.log(workingCheckout)
}

async function setup () {
  // load data
  let url = await parseLibraryUrl()
  let browserInfo = beaker.browser.getInfo()
  OS_USES_META_KEY = browserInfo.platform === 'darwin'
  window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform === 'darwin'
  hotkeys.configure({OS_USES_META_KEY})

  // bind events
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', hotkeys.onGlobalKeydown)
  document.addEventListener('editor-rerender', update)
  document.addEventListener('editor-model-dirtied', update)
  document.addEventListener('editor-model-cleaned', update)
  document.addEventListener('editor-set-active', onSetActive)
  document.addEventListener('editor-set-active-deleted-filediff', onSetActiveDeletedFilediff)
  document.addEventListener('editor-show-general-help', onShowGeneralHelp)
  document.addEventListener('editor-save-active-model', onSaveActiveModel)
  document.addEventListener('editor-new-model', onNewModel)
  document.addEventListener('editor-unload-active-model', onUnloadActiveModel)
  document.addEventListener('editor-unload-model', onUnloadModel)
  document.addEventListener('editor-unload-all-models-except', onUnloadAllModelsExcept)
  document.addEventListener('editor-unload-all-models', onUnloadAllModels)
  document.addEventListener('editor-reorder-models', onReorderModels)
  document.addEventListener('editor-all-models-closed', onAllModelsClosed)
  document.addEventListener('editor-cycle-tabs', onCycleTabs)
  document.addEventListener('editor-show-tab', onShowTab)
  document.addEventListener('editor-import-files', onImportFiles)
  document.addEventListener('editor-import-folder', onImportFolder)
  document.addEventListener('editor-new-folder', onNewFolder)
  document.addEventListener('editor-create-folder', onCreateFolder)
  document.addEventListener('editor-new-file', onNewFile)
  document.addEventListener('editor-create-file', onCreateFile)
  document.addEventListener('editor-rename-file', onRenameFile)
  document.addEventListener('editor-delete-file', onDeleteFile)
  document.addEventListener('editor-open-file', onOpenFile)
  document.addEventListener('editor-commit-file', onCommitFile)
  document.addEventListener('editor-revert-file', onRevertFile)
  document.addEventListener('editor-commit-all', onCommitAll)
  document.addEventListener('editor-revert-all', onRevertAll)
  document.addEventListener('editor-diff-active-model', onDiffActiveModel)
  document.addEventListener('editor-toggle-preview-mode', onTogglePreviewMode)
  document.addEventListener('editor-change-sync-path', onChangeSyncPath)
  document.addEventListener('editor-remove-sync-path', onRemoveSyncPath)
  document.addEventListener('editor-set-favicon', onSetFavicon)
  document.addEventListener('editor-set-site-info', onSetSiteInfo)
  document.addEventListener('editor-fork', onFork)
  document.addEventListener('editor-archive-save', onArchiveSave)
  document.addEventListener('editor-archive-unsave', onArchiveUnsave)
  document.addEventListener('editor-archive-delete-permanently', onArchiveDeletePermanently)

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
    isReadonly = !_get(archive, 'info.userSettings.isSaved') || !archive.info.isOwner || !Number.isNaN(+workingCheckoutVersion)
    if (isReadonly) {
      window.editor.updateOptions({readOnly: true})
    }

    // load the archiveFS
    archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
    await loadFileTree()
    await sidebar.setArchiveFsRoot(archiveFsRoot)
    sidebar.configure({
      isReadonly,
      version: workingCheckoutVersion,
      previewMode: _get(archive, 'info.userSettings.previewMode')
    })

    if (_get(archive, 'info.userSettings.isSaved')) {
      let fileActStream = archive.watch()
      fileActStream.addEventListener('changed', onFilesChanged)
      if (_get(archive, 'info.userSettings.previewMode')) {
        fileActStream = workingCheckout.watch()
        fileActStream.addEventListener('changed', onFilesChanged)
      }
    }
    
    document.title = `Editor - ${_get(archive, 'info.title') || 'Untitled'}`
  } else {
    let untitled = monaco.editor.createModel('')
    untitled.name = 'untitled'
    untitled.isEditable = true
    editor.setModel(untitled)
  }

  // ready archive diff
  await localCompare()

  // show the general help view
  update()
  showGeneralHelp()
}

async function showGeneralHelp () {
  models.setActiveGeneralHelp({
    archiveInfo: archive.info,
    currentDiff,
    readmeMd: await loadReadme(),
    workingCheckoutVersion,
    isReadonly,
    hasTitle: !!archive.info.title,
    hasFavicon: !!(findArchiveNode('/favicon.ico') || findArchiveNode('/favicon.png')),
    hasIndexFile: !!(findArchiveNode('/index.html') || findArchiveNode('/index.md')),
    OS_USES_META_KEY
  })
}

async function localCompare () {
  if (!_get(archive, 'info.userSettings.isSaved') || !_get(archive, 'info.userSettings.previewMode') || workingCheckoutVersion !== 'preview') {
    return
  }

  try {
    currentDiff = await beaker.archives.diffLocalSyncPathListing(archive.url, {compareContent: true, shallow: true})
    sidebar.setCurrentDiff(currentDiff)
  } catch (e) {
    console.warn('Failed to diff local file listing', e)
    return
  }

  // attach add/mod changes to the existing tree
  const checkNode = async (node) => {
    // check for diff
    var diff = currentDiff.find(diff => {
      if (diff.path === node._path) return true
      if (node._path.startsWith(diff.path + '/')) return true // is a child of this item
      return false
    })
    node.change = diff ? diff.change : false

    // recurse
    if (node.isContainer) {
      for (let c of node.children) {
        await checkNode(c)
      }
    }
  }
  await checkNode(archiveFsRoot)
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

async function loadFileTree () {
  const reload = async (node) => {
    if (node.isContainer && (node === archiveFsRoot || node.isExpanded)) {
      for (let c of node.children) {
        await reload(c)
      }
      await node.readData({ignoreCache: true})
      node.sort()
    }
  }
  try {
    await reload(archiveFsRoot)
  } catch (e) {
    console.warn('Failed to read filetree', e)
  }
}

function getActiveFile () {
  var activeModel = models.getActive()
  return activeModel ? findArchiveNode(activeModel.uri.path.slice(1)) : null
}

function findArchiveNode (path) {
  var node = archiveFsRoot
  var pathParts = path.split(/[\\\/]/g)
  for (let filename of pathParts) {
    if (filename.length === 0) continue // first item in array might be empty
    if (!node.isContainer) return null // node not found (we ran into a file prematurely)
    node = node._files.find(n => n.name === filename) // move to next child in the tree
  }
  return node
}

async function findArchiveNodeAsync (path) {
  var node = archiveFsRoot
  var pathParts = path.split(/[\\\/]/g)
  for (let filename of pathParts) {
    if (filename.length === 0) continue // first item in array might be empty
    if (!node.isContainer) return null // node not found (we ran into a file prematurely)
    await node.readData() // load latest filetree
    node = node._files.find(n => n.name === filename) // move to next child in the tree
  }
  return node
}

async function loadReadme () {
  const readmeMdNode = archiveFsRoot.children.find(n => (n._name || '').toLowerCase() === 'readme.md')
  return readmeMdNode ? await workingCheckout.readFile(readmeMdNode._path, 'utf8') : ''
}

// rendering
// =

function update () {
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
  yo.update(
    document.querySelector('.editor-tabs'),
    tabs.render({
      archive: workingCheckout,
      models: models.getModels(),
      archiveInfo: archive.info,
      isReadonly,
      openLinkVersion: workingCheckoutVersion
    })
  )
  updateToolbar()
  // if (models.getActive() === null) {
  //   showGeneralHelp()
  // }
}

function updateToolbar () {
  var opts = {
    previewMode: _get(archive, 'info.userSettings.previewMode')
  }
  yo.update(
    document.querySelector('.editor-toolbar'),
    toolbar.render(getActiveFile(), models.getActive(), opts)
  )
}

function confirmChangeOnLatest () {
  var previewMode = _get(archive, 'info.userSettings.previewMode')
  if (previewMode && workingCheckoutVersion === 'latest') {
    if (!confirm('You are about to save directly to the published version instead of the preview. Continue?')) {
      return false
    }
  }
  return true
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

async function onFilesChanged () {
  // update data
  await loadFileTree()
  await localCompare()

  // remove any models that have been unloaded
  for (let m of models.getModels()) {
    if (!findArchiveNode(m.uri.path)) {
      models.unload(m)
    }
  }

  // rerender
  sidebar.rerender()
  updateToolbar()
}

async function onSetFavicon (e) {
  var {imageData} = e.detail
  if (imageData) {
    await workingCheckout.writeFile('/favicon.ico', imageData)
  } else {
    await workingCheckout.unlink('/favicon.ico').catch(e => null)
    await beaker.sitedata.set(archive.url, 'favicon', '') // clear cache
  }
  if (!models.getActive()) {
    // update general help view if it's active
    await loadFileTree()
    showGeneralHelp()
  }
  closeAllToggleables()
}

async function onSetSiteInfo (e) {
  await workingCheckout.configure(e.detail)
  location.reload()
}

async function onFork (e) {
  var fork = await DatArchive.fork(archive.url)
  window.location = `beaker://editor/${fork.url}`
}

async function onArchiveSave (e) {
  await beaker.archives.add(archive.url)
  location.reload()
}

async function onArchiveUnsave (e) {
  await beaker.archives.remove(archive.url)
  location.reload()
}

async function onArchiveDeletePermanently (e) {
  if (!confirm('Delete permanently?')) return
  try {
    await beaker.archives.delete(archive.url)
    window.location = 'beaker://library'
  } catch (e) {
    console.error(e)
    toast.create(e.toString(), 'error')
  }
}

async function onSetActive (e) {
  if (e.detail.path) {
    await models.setActive(findArchiveNode(e.detail.path))
  } else {
    await models.setActive(e.detail.model)
  }
  if (e.detail.showDiff) {
    onDiffActiveModel()
  }
}

function onSetActiveDeletedFilediff (e) {
  models.setActiveDeletedFilediff(e.detail.filediff)
}

function onShowGeneralHelp (e) {
  showGeneralHelp()
}

function onNewModel (e) {
  models.setActive(models.createNewModel())
}

function onUnloadActiveModel (e) {
  models.unload(models.getActive())
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

function onAllModelsClosed (e) {
  showGeneralHelp()
}

function onCycleTabs (e) {
  var allModels = models.getModels()
  var active = models.getActive()
  var index = active ? allModels.indexOf(active) : -1
  index = e.detail && e.detail.reverse ? index - 1 : index + 1
  if (index < -1) {
    models.setActive(allModels[allModels.length - 1])
  } else if (index >= allModels.length) {
    showGeneralHelp()
  } else {
    models.setActive(allModels[index])
  }
}

function onShowTab (e) {
  if (e.detail.tab === 1) {
    showGeneralHelp()
  } else {
    var model = models.getModels()[e.detail.tab - 2]
    if (model) models.setActive(model)
  }
}

async function onCreateFile (e) {
  if (!confirmChangeOnLatest()) return
  await op('Saving...', async () => {
    const {path} = e.detail

    // create the new file if needed
    var exists = false
    try {
      var st = await workingCheckout.stat(path)
      if (st) exists = true
    } catch (e) {
      // not found
    }
    if (!exists) {
      await workingCheckout.writeFile(path, '')
    }

    // open the new file
    await loadFileTree()
    models.setActive(await findArchiveNodeAsync(path))
  })
}

function onNewFile (e) {
  // add a 'new file' node to the tree and rerender
  var parent = findArchiveNode(e.detail.path)
  if (!parent) return
  parent.newFile()

  // render and focus the input
  sidebar.rerender()
  document.querySelector('.editor-sidebar input').focus()
}

async function onCreateFolder (e) {
  await op('Saving...', async () => {
    const {path} = e.detail
    await workingCheckout.mkdir(path)
  })
}

async function onImportFiles (e) {
  if (!confirmChangeOnLatest()) return

  var dst = archive.url + e.detail.path
  var files = await beaker.browser.showOpenDialog({
    title: 'Import files',
    buttonLabel: 'Import',
    properties: ['openFile', OS_CAN_IMPORT_FOLDERS_AND_FILES ? 'openDirectory' : false, 'multiSelections', 'createDirectory'].filter(Boolean)
  })
  if (files) {
    for (let src of files) {
      await DatArchive.importFromFilesystem({src, dst, ignore: ['dat.json'], inplaceImport: false})
    }
  }
}

async function onImportFolder (e) {
  if (!confirmChangeOnLatest()) return

  var dst = archive.url + e.detail.path
  var folders = await beaker.browser.showOpenDialog({
    title: 'Import folders',
    buttonLabel: 'Import',
    properties: ['openDirectory', 'createDirectory']
  })
  if (folders) {
    for (let src of folders) {
      await DatArchive.importFromFilesystem({src, dst, ignore: ['dat.json'], inplaceImport: false})
    }
  }
}

function onNewFolder (e) {
  // add a 'new folder' node to the tree and rerender
  var parent = findArchiveNode(e.detail.path)
  if (!parent) return
  parent.newFolder()
  parent.sort()

  // render and focus the input
  sidebar.rerender()
  document.querySelector('.editor-sidebar input').focus()
}

async function onRenameFile (e) {
  if (!confirmChangeOnLatest()) return
  await op('Renaming...', async () => {
    const {oldPath, newPath} = e.detail
    await workingCheckout.rename(oldPath, newPath)
  })
}

async function onDeleteFile (e) {
  if (!confirmChangeOnLatest()) return
  await op('Deleting...', async () => {
    const {path, isFolder} = e.detail
    if (isFolder) {
      await workingCheckout.rmdir(path, {recursive: true})
    } else {
      await workingCheckout.unlink(path)
    }
    toast.create(`Deleted ${path}`, 1e3)
  })
}

function onOpenFile (e) {
  window.open(workingCheckout.url + e.detail.path)
}

async function onCommitFile (e) {
  await op('Committing...', async () => {
    const path = e.detail.path
    await beaker.archives.publishLocalSyncPathListing(archive.url, {paths: [path]})
    models.exitDiff()
    toast.create(`Committed ${path}`, 'success', 1e3)
  })
}

async function onRevertFile (e) {
  await op('Reverting...', async () => {
    const path = e.detail.path
    await beaker.archives.revertLocalSyncPathListing(archive.url, {paths: [path]})
    models.reload(findArchiveNode(path))
    models.exitDiff()
    toast.create(`Reverted ${path}`, 'success', 1e3)
  })
}

async function onCommitAll (e) {
  await op('Committing...', async () => {
    // commit
    var paths = fileDiffsToPaths(currentDiff)
    await beaker.archives.publishLocalSyncPathListing(archive.url, {shallow: false, paths})
    toast.create(`Committed all changes`, 'success', 1e3)
  })

  // update view
  await loadFileTree()
  await localCompare()
  showGeneralHelp()
}

async function onRevertAll (e) {
  await op('Reverting...', async () => {
    // revert
    var paths = fileDiffsToPaths(currentDiff)
    await beaker.archives.revertLocalSyncPathListing(archive.url, {shallow: false, paths})
    toast.create(`Reverted all changes`, 'success', 1e3)
  })

  // update view
  await loadFileTree()
  await localCompare()
  showGeneralHelp()
}

async function onDiffActiveModel (e) {
  await op('Diffing...', async () => {
    if (models.isShowingDiff()) {
      // toggle
      models.setActive(models.getActive())
      return
    }
    

    var active = models.getActive()
    var rightContent = active.getValue()

    var path = active.uri.path
    var file = findArchiveNode(path)
    if (!file || file.change !== 'mod') return

    // get left hand content
    var leftContent = ''
    if (workingCheckout.url.includes('+')) {
      // left is preview or historic, right should be latest
      leftContent = await workingCheckout.checkout().readFile(path)
    } else {
      // left is latest, right should be preview
      leftContent = await workingCheckout.checkout('preview').readFile(path)
    }

    models.setActiveDiff(leftContent, rightContent)
  })
}

async function onSaveActiveModel () {
  if (!confirmChangeOnLatest()) return

  var model = models.getActive()
  if (!model) return

  // get the path
  var path = model.uri.path
  if (model.isNewModel) {
    path = prompt('Enter the path for this file')
    if (!path) return
  }
  if (!path.startsWith('/')) {
    path = '/' + path
  }

  await op('Saving...', async () => {
    // write the file
    models.setVersionIdOnSave(model)
    await workingCheckout.writeFile(path, model.getValue(), 'utf8')
  })
  
  // if it's a new file, close this buffer and reopen the new one
  if (model.isNewModel) {
    await loadFileTree()
    models.unload(model)
    models.setActive(await findArchiveNodeAsync(path))
  }
}

async function onTogglePreviewMode () {
  if (!archive.info.isOwner) return

  var previewMode = _get(archive, 'info.userSettings.previewMode')
  if (previewMode) {
    // prompt to resolve changes
    if (currentDiff && currentDiff.length) {
      alert('You have unpublished changes. Please commit or revert them before disabling preview mode.')
      return
    }
  }

  try {
    previewMode = !previewMode
    await beaker.archives.setUserSettings(archive.url, {previewMode})
    window.location = `beaker://editor/${archive.checkout().url}` // trigger reload at default version
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
    console.error(e)
  }
}

async function onChangeSyncPath () {
  if (!archive.info.isOwner) return

  // get an available path for a folder
  var currentPath = _get(archive, 'info.userSettings.localSyncPath')
  var defaultPath = ''
  if (!currentPath) {
    let basePath = await beaker.browser.getSetting('workspace_default_path')
    defaultPath = await beaker.browser.getDefaultLocalPath(basePath, archive.info.title)
  }

  var hasUnpublishedChanges = false
  var previewMode = _get(archive, 'info.userSettings.previewMode')
  if (previewMode) {
    // prompt to resolve changes
    hasUnpublishedChanges = currentDiff && currentDiff.length > 0
  }

  // open the create folder-picker popup
  let res = await localSyncPathPopup.create({
    defaultPath,
    currentPath,
    checkConflicts: !previewMode,
    hasUnpublishedChanges,
    archiveKey: archive.info.key,
    title: archive.info.title
  })
  let localSyncPath = res.path

  try {
    // always enable preview-mode
    await beaker.archives.setUserSettings(archive.url, {previewMode: true})
    
    // set folder
    await beaker.archives.setLocalSyncPath(archive.url, localSyncPath)

    // open folder and reload page
    beaker.browser.openFolder(localSyncPath)
    window.location.reload()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
    console.error(e)
  }
}

async function onRemoveSyncPath (e) {
  if (!archive.info.isOwner) return

  try {
    await beaker.archives.setLocalSyncPath(archive.url, null)
    window.location.reload()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
    console.error(e)
  }
}

// internal methods
// =

async function op (msg, fn) {
  const to = setTimeout(() => toast.create(msg), 500) // if it takes a while, toast
  try {
    await fn()
    update()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
  clearTimeout(to)
}

function fileDiffsToPaths (filediff) {
  return filediff.map(d => {
    if (d.type === 'dir') return d.path + '/' // indicate that this is a folder
    return d.path
  })
}
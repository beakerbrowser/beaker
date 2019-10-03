/* globals DatArchive beaker monaco editor diffEditor localStorage hljs confirm sessionStorage location alert history */

import yo from 'yo-yo'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive} from 'builtin-pages-lib'
import _get from 'lodash.get'
import * as hotkeys from '../com/editor/hotkeys'
import * as sidebar from '../com/editor/sidebar'
import * as settingsForm from '../com/editor/settings-form'
import * as tabs from '../com/editor/tabs'
import * as importPopup from '../com/editor/import-popup'
import * as toolbar from '../com/editor/toolbar'
import * as models from '../com/editor/models'
import * as toast from '../com/toast'
import renderArchiveHistory from '../com/archive/archive-history'
import * as contextMenu from '../com/context-menu'
import {writeToClipboard} from '../../lib/event-handlers'
import toggleable2, {closeAllToggleables}  from '../com/toggleable2'
import * as localSyncPathPopup from '../com/library/localsyncpath-popup'
const profiles = navigator.importSystemAPI('unwalled-garden-profiles')

const DEFAULT_SIDEBAR_WIDTH = 190
const MIN_SIDEBAR_WIDTH = 100
const RIGHT_SIDEBAR_COLLAPSED_WIDTH = 34
const RIGHT_SIDEBAR_EXPANDED_WIDTH = 340

var isLoading = true
var loadError = ''
var userProfile
var archive
var workingCheckoutVersion
var workingCheckout
var workingDatJson
var archiveFsRoot
var currentDiff
var isReadonly

var sidebarWidth
var isDraggingSidebar = false
var isRightSidebarOpen = localStorage.isRightSidebarClosed != 1

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
  // render loading screen
  isLoading = true
  update()

  // load data
  userProfile = await profiles.me()
  let url = window.location.pathname.slice(1)
  let browserInfo = beaker.browser.getInfo()
  OS_USES_META_KEY = browserInfo.platform === 'darwin'
  window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform === 'darwin'
  hotkeys.configure({OS_USES_META_KEY})

  // bind events
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', hotkeys.onGlobalKeydown)

  const on = (evt, fn) => document.addEventListener(evt, fn)
  on('editor-rerender', update)
  on('editor-model-dirtied', update)
  on('editor-model-cleaned', update)
  on('editor-set-active', onSetActive)
  on('editor-set-active-deleted-filediff', onSetActiveDeletedFilediff)
  on('editor-toggle-container-expanded', onToggleContainerExpanded)
  on('editor-show-home', onShowHome)
  on('editor-save-active-model', onSaveActiveModel)
  on('editor-new-model', onNewModel)
  on('editor-unload-active-model', onUnloadActiveModel)
  on('editor-unload-model', onUnloadModel)
  on('editor-unload-all-models-except', onUnloadAllModelsExcept)
  on('editor-unload-all-models', onUnloadAllModels)
  on('editor-reorder-models', onReorderModels)
  on('editor-all-models-closed', onAllModelsClosed)
  on('editor-cycle-tabs', onCycleTabs)
  on('editor-show-tab', onShowTab)
  on('editor-import-files', onImportFiles)
  on('editor-import-folder', onImportFolder)
  on('editor-new-folder', onNewFolder)
  on('editor-create-folder', onCreateFolder)
  on('editor-new-file', onNewFile)
  on('editor-create-file', onCreateFile)
  on('editor-rename-file', onRenameFile)
  on('editor-delete-file', onDeleteFile)
  on('editor-open-file', onOpenFile)
  on('editor-commit-file', onCommitFile)
  on('editor-revert-file', onRevertFile)
  on('editor-commit-all', onCommitAll)
  on('editor-revert-all', onRevertAll)
  on('editor-diff-active-model', onDiffActiveModel)
  on('editor-toggle-preview-mode', onTogglePreviewMode)
  on('editor-change-sync-path', onChangeSyncPath)
  on('editor-remove-sync-path', onRemoveSyncPath)
  on('editor-set-favicon', onSetFavicon)
  on('editor-set-site-info', onSetSiteInfo)
  on('editor-fork', onFork)
  on('editor-archive-save', onArchiveSave)
  on('editor-archive-unsave', onArchiveUnsave)
  on('editor-archive-delete-permanently', onArchiveDeletePermanently)

  // setup the sidebar resizer
  setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
  var sidebarDragHandleEl = document.querySelector('#editor-sidebar-drag-handle')
  sidebarDragHandleEl.addEventListener('mousedown', onMousedownSidebarDragHandle)
  document.addEventListener('mouseup', onGlobalMouseup)
  document.addEventListener('mousemove', onGlobalMousemove)

  try {
    if (url) {
      ;archive = new Archive(url)
      await archive.setup()
      await setupWorkingCheckout()
      archive.info.canDelete = archive.info.isOwner && archive.info.url !== userProfile.url
      isReadonly = !_get(archive, 'info.userSettings.isSaved') || !archive.info.isOwner || !Number.isNaN(+workingCheckoutVersion)
      if (isReadonly) {
        window.editor.updateOptions({readOnly: true})
      }

      // load the archiveFS
      archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
      await loadFileTree()
      await sidebar.setArchiveFsRoot(archiveFsRoot)
      workingDatJson = await readWorkingDatJson()
      sidebar.configure({
        workingDatJson,
        isReadonly
      })

      // listen for changes
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
  } catch (e) {
    if (e.name === 'TimeoutError') {
      loadError = 'The dat site could not be found on the network. Make sure it is online and that you are connected to the Internet.'
    } else {
      loadError = e.toString()
    }
    update()
    return
  }

  // show the general help view
  isLoading = false
  update()
  showHome()

  // load the given path
  try {
    let urlp = new URL(url)
    if (urlp.pathname && !urlp.pathname.endsWith('/')) {
      models.setActive(await findArchiveNodeAsync(urlp.pathname, true))
    }
  } catch (e) {
    // ignore
  }
}

async function showHome () {
  models.setActiveHome({
    userProfile,
    archiveInfo: archive.info,
    currentDiff,
    readmeMd: await loadReadme(),
    workingCheckoutVersion,
    workingDatJson,
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
  attachDiffToTree(archiveFsRoot)
}

function attachDiffToTree (node) {
  if (!currentDiff) return
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
      attachDiffToTree(c)
    }
  }
}

// helper called in certain error conditions to check if the local path has disappeared on us
async function checkForMissingLocalPath () {
  let info = await archive.getInfo()
  if (info.localSyncPathIsMissing) {
    archive.info.localSyncPathIsMissing = true
    archive.info.missingLocalSyncPath = info.missingLocalSyncPath
    return true
  }
  return false
}

function setSidebarWidth (width) {
  if (typeof width !== 'undefined') {
    sidebarWidth = width
  }

  var actualWidth = getActualSidebarWidth()
  if (actualWidth === 0) {
    document.querySelector('#editor-sidebar-drag-handle').classList.add('wide')
  } else {
    document.querySelector('#editor-sidebar-drag-handle').classList.remove('wide')
  }

  const setWidth = (sel, v) => {
    /** @type HTMLElement */(document.querySelector(sel)).style.width = v
  }
  var rightSidebarWidth = isRightSidebarOpen ? RIGHT_SIDEBAR_EXPANDED_WIDTH : RIGHT_SIDEBAR_COLLAPSED_WIDTH
  setWidth('.editor-sidebar', `${actualWidth}px`)
  setWidth('.editor-container', `calc(100vw - ${actualWidth + rightSidebarWidth}px)`) // allows monaco to resize properly
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
      try {
        await node.readData({ignoreCache: true})
      } catch (e) {
        // ignore
      }
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
    if (!node || !node.isContainer) return null // node not found (we ran into a file prematurely)
    node = node._files.find(n => n.name === filename) // move to next child in the tree
  }
  return node
}

async function findArchiveNodeAsync (path, expandToPath = false) {
  var node = archiveFsRoot
  var pathParts = path.split(/[\\\/]/g)
  for (let filename of pathParts) {
    if (filename.length === 0) continue // first item in array might be empty
    if (!node || !node.isContainer) return null // node not found (we ran into a file prematurely)
    await node.readData() // load latest filetree
    if (expandToPath) node.isExpanded = true
    node.sort()
    node = node._files.find(n => n.name === filename) // move to next child in the tree
  }
  attachDiffToTree(node)
  return node
}

async function loadReadme () {
  const readmeMdNode = archiveFsRoot.children.find(n => (n._name || '').toLowerCase() === 'readme.md')
  var md =  readmeMdNode ? await workingCheckout.readFile(readmeMdNode._path, 'utf8') : ''
  return md.replace(/<!--(.*)-->/gm, '') // strip html comments
}

// rendering
// =

function update () {
  if (loadError) {
    // loading error
    let url = window.location.pathname.slice(1)
    yo.update(
      document.querySelector('.cover-screen'),
      yo`
        <div class="cover-screen">
          <div class="cover-screen-centered">
            <div class="load-error">
              <div>
                <small>
                  <span class="fas fa-exclamation-triangle"></span>
                  We encountered an issue
                </small>
              </div>
              <div>${loadError}</div>
              <div><small>Address: <a class="link" href="${url}">${url}</a></small></div>
            </div>
          </div>
        </div>
      `
    )
    return
  }

  if (isLoading) {
    // loading screen
    yo.update(
      document.querySelector('.cover-screen'),
      yo`
        <div class="cover-screen">
          <div class="cover-screen-centered">
            <div class="loading-notice"><span class="spinner"></span> Fetching from the network...</div>
          </div>
        </div>
      `
    )
    return
  }

  if (!archive) {
    // select archive screen
    yo.update(
      document.querySelector('.cover-screen'),
      yo`
        <div class="cover-screen gray">
          <div class="cover-screen-leftpane">
            <h1>Beaker Editor</h1>
            <button class="btn primary thick" onclick=${onOpenSite}>Open site</button>
          </div>
        </div>
      `
    )
    return
  }

  // active editor
  yo.update(document.querySelector('.cover-screen'), yo`<div class="cover-screen hidden"></div>`)
  yo.update(
    document.querySelector('.editor-sidebar'),
    yo`
      <div class="editor-sidebar" style="width: ${getActualSidebarWidth()}px">
        ${sidebar.render()}
      </div>
    `
  )
  let viewSiteUrl = workingCheckoutVersion === 'latest' ? archive.checkout().url : archive.checkout(workingCheckoutVersion).url
  if (archive.info.domain) viewSiteUrl = viewSiteUrl.replace(archive.key, archive.info.domain)
  if (isRightSidebarOpen) {
    yo.update(
      document.querySelector('.editor-settings-sidebar'),
      yo`<div class="editor-settings-sidebar">
        <div class="ctrls">
          <a class="btn primary" href=${viewSiteUrl} target="_blank">
            <i class="fas fa-external-link-alt"></i> View site
          </a>
          ${renderVersionPicker(false)}
          <button class="btn white nofocus" onclick=${onClickArchiveMenu}>
            <span class="fas fa-ellipsis-h"></span>
          </button>
          <button class="btn transparent nofocus" style="margin-left: auto; margin-right: 0" onclick=${onToggleRightSidebar}>
            <i class="far fa-fw fa-caret-square-right"></i>
          </button>
        </div>
        ${settingsForm.render(workingCheckout, isReadonly, archive.info, workingDatJson)}
      </div>`
    )
  } else {
    yo.update(
      document.querySelector('.editor-settings-sidebar'),
      yo`<div class="editor-settings-sidebar collapsed">
        <div class="ctrls">
          <a class="btn primary" href=${viewSiteUrl} target="_blank">
            <i class="fas fa-external-link-alt"></i>
          </a>
          ${renderVersionPicker(true)}
          <button class="btn white nofocus" onclick=${onToggleRightSidebar}>
            <i class="fas fa-cog"></i>
          </button>
          <button class="btn white nofocus" onclick=${onClickArchiveMenu}>
            <span class="fas fa-ellipsis-h"></span>
          </button>
        </div>
      </div>`
    )
  }
  yo.update(
    document.querySelector('.editor-tabs'),
    tabs.render({models: models.getModels()})
  )
  updateToolbar()
}

function renderVersionPicker (isSmallBtn) {
  const currentVersion = workingCheckoutVersion
  const includePreview = _get(archive, 'info.userSettings.previewMode')

  const button = (onToggle) =>
    yo`
      <button
        class="btn white nofocus"
        onclick=${onToggle}>
        ${isSmallBtn ? yo`
          <span class="fas fa-history"></span>
        ` : yo`
          <div>
            <span class="fas fa-history"></span>
            Version: ${currentVersion}
            <span class="fa fa-angle-down"></span>
          </div>
        `}
      </button>
    `

  return toggleable2({
    id: 'version-picker',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container version-picker-ctrl">
        ${button(onToggle)}
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown toggleable-container version-picker-ctrl">
        ${button(onToggle)}
        <div class="dropdown-items">
          ${renderArchiveHistory(archiveFsRoot._archive, {currentVersion, viewerUrl: 'beaker://editor', includePreview})}
        </div>
      </div>`
  })
}

function updateToolbar () {
  var opts = {
    isSiteEditable: !isReadonly,
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

async function readWorkingDatJson () {
  var datJson
  try {
    datJson = JSON.parse(await workingCheckout.readFile('/dat.json'))
  } catch (e) {
    datJson = {}
  }
  datJson.title = datJson.title || ''
  datJson.description = datJson.description || ''
  return datJson
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

async function onOpenSite (e) {
  var archive = await DatArchive.selectArchive()
  window.location = `beaker://editor/${archive.url}`
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
  if (models.getActive() === null) {
    showHome()
  }
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
    showHome()
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
  try {
    if (e.detail.path) {
      await models.setActive(await findArchiveNodeAsync(e.detail.path))
    } else {
      await models.setActive(e.detail.model)
    }
  } catch (err) {
    if (await checkForMissingLocalPath()) {
      toast.create('The local folder has been deleted or moved', 'error')
      showHome() // switch to general help to show alert
    } else {
      console.error('Failed to set active', e.detail, err)
      toast.create(err.toString(), 'error')
    }
    return
  }
  if (e.detail.showDiff) {
    onDiffActiveModel()
  }
}

function onSetActiveDeletedFilediff (e) {
  models.setActiveDeletedFilediff(e.detail.filediff)
}

async function onToggleContainerExpanded (e) {
  var node = findArchiveNode(e.detail.path)
  node.isExpanded = !node.isExpanded
  if (node.isExpanded) {
    await node.readData({ignoreCache: true})
    node.sort()

    // pass on diff state
    if (node.change === 'add') {
      for (let c of node.children) {
        c.change = 'add'
      }
    } else {
      attachDiffToTree(node)
    }
  }
  sidebar.rerender()
}

function onShowHome (e) {
  showHome()
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
  showHome()
}

function onCycleTabs (e) {
  var allModels = models.getModels()
  var active = models.getActive()
  var index = active ? allModels.indexOf(active) : -1
  index = e.detail && e.detail.reverse ? index - 1 : index + 1
  if (index < -1) {
    models.setActive(allModels[allModels.length - 1])
  } else if (index >= allModels.length) {
    showHome()
  } else {
    models.setActive(allModels[index])
  }
}

function onShowTab (e) {
  if (e.detail.tab === 1) {
    showHome()
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

  var dst = workingCheckout.url + e.detail.path
  var files = await beaker.browser.showOpenDialog({
    title: 'Import files',
    buttonLabel: 'Import',
    properties: ['openFile', OS_CAN_IMPORT_FOLDERS_AND_FILES ? 'openDirectory' : false, 'multiSelections', 'createDirectory'].filter(Boolean)
  })
  if (files) {
    importPopup.create({dst, srcs: files})
  }
}

async function onImportFolder (e) {
  if (!confirmChangeOnLatest()) return

  var dst = workingCheckout.url + e.detail.path
  var folders = await beaker.browser.showOpenDialog({
    title: 'Import folders',
    buttonLabel: 'Import',
    properties: ['openDirectory', 'createDirectory']
  })
  if (folders) {
    importPopup.create({dst, srcs: folders})
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
  showHome()
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
  showHome()
}

async function onDiffActiveModel (e) {
  await op('Diffing...', async () => {
    if (models.isShowingDiff()) {
      // toggle
      models.setActive(models.getActive())
      return
    }

    var active = models.getActive()

    var path = active.uri.path
    var file = findArchiveNode(path)
    if (!file || file.change !== 'mod') return

    // get content and render
    var leftContent = await workingCheckout.checkout().readFile(path)
    var rightContent = await workingCheckout.checkout('preview').readFile(path)
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
    try {
      await workingCheckout.writeFile(path, model.getValue(), 'utf8')
    } catch (e) {
      console.error('Failed to save', e)
      if (e.name === 'ParentFolderDoesntExistError') {
        throw 'Cannot save to that location: the parent directory does not exist'
      } else if (e.name === 'InvalidPathError') {
        throw `Invalid file name (${e.message})`
      } else {
        throw e
      }
    }
    models.setVersionIdOnSave(model)
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

function onToggleRightSidebar (e) {
  e.preventDefault()
  isRightSidebarOpen = !isRightSidebarOpen
  localStorage.isRightSidebarClosed = Number(!isRightSidebarOpen)
  update()
  setSidebarWidth()
}

function onClickArchiveMenu (e) {
  e.preventDefault()
  e.stopPropagation()
  var rect = e.currentTarget.getClientRects()[0]
  contextMenu.create({
    x: rect.right,
    y: rect.bottom,
    right: true,
    withTriangle: true,
    items: [
      _get(archive, 'info.userSettings.isSaved')
        ? {icon: 'fas fa-trash', label: 'Remove from my websites', click: onArchiveUnsave}
        : {icon: 'fas fa-save', label: 'Add to my websites', click: onArchiveSave},
      {icon: 'link', label: 'Copy link', click: () => { writeToClipboard(archive.url); toast.create('Link copied to clipboard') }},
      {icon: 'far fa-clone', label: 'Duplicate this site', click: onFork}
    ]
  })
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
    throw e
  } finally {
    clearTimeout(to)
  }
}

function fileDiffsToPaths (filediff) {
  return filediff.map(d => {
    if (d.type === 'dir') return d.path + '/' // indicate that this is a folder
    return d.path
  })
}

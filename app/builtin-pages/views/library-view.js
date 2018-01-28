/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import FilesBrowser from '../com/files-browser2'
import renderDiff from '../com/diff'
import renderPeerHistoryGraph from '../com/peer-history-graph'
import * as toast from '../com/toast'
import * as workspacePopup from '../com/library-workspace-popup'
import {pluralize, shortenHash} from '../../lib/strings'
import {throttle} from '../../lib/functions'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import createMd from '../../lib/fg/markdown'

// globals
// =

var activeView // will default to 'files'
var archive
var archiveFsRoot
var filesBrowser

var workspaceInfo

var markdownRenderer = createMd()
var readmeElement

// current values being edited in settings
// false means not editing
var settingsEditValues = {
  title: false,
  description: false
}

var error

// HACK
// Linux is not capable of importing folders and files in the same dialog
// unless we create our own import dialog (FFS!) we just need to change
// behavior based on which platform we're on. This flag tracks that.
// -prf
window.OS_CAN_IMPORT_FOLDERS_AND_FILES = true

// main
// =

setup()
async function setup () {
  try {
    // load platform info
    let browserInfo = await beaker.browser.getInfo()
    window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform !== 'linux'

    // load data
    let url = window.location.pathname.slice(1)
    archive = new LibraryDatArchive(url)
    await archive.setup()

    document.title = `Library - ${archive.info.title || 'Untitled'}`

    // construct files browser
    archiveFsRoot = new FSArchive(null, archive.info)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource

    // set up download progress
    await archive.startMonitoringDownloadProgress()

    // fetch workspace info for this archive
    workspaceInfo = await beaker.workspaces.get(0, archive.info.url)
    await loadWorkspaceRevisions()

    // load state and render
    await readViewStateFromUrl()

    // wire up events
    window.addEventListener('popstate', onPopState)
    archive.progress.addEventListener('changed', render)
    document.body.addEventListener('click', onClickOutsideSettingsEditInput)
    beaker.archives.addEventListener('network-changed', onNetworkChanged)
    setupWorkspaceListeners()

    let onFilesChangedThrottled = throttle(onFilesChanged, 1e3)
    var fileActStream = archive.createFileActivityStream()
    fileActStream.addEventListener('invalidated', onFilesChangedThrottled)
    fileActStream.addEventListener('changed', onFilesChangedThrottled)
  } catch (e) {
    error = e
    render()
  }

  if (archive) {
    // update last library access time
    beaker.archives.touch(
      archive.url.slice('dat://'.length),
      'lastLibraryAccessTime'
    ).catch(console.error)
  }
}

function setupWorkspaceListeners () {
  if (workspaceInfo) {
    var fileActStream = beaker.workspaces.createFileActivityStream(0, workspaceInfo.name)
    let onWorkspaceChangedThrottled = throttle(onWorkspaceChanged, 1e3)
    fileActStream.addEventListener('changed', onWorkspaceChangedThrottled)
  }
}

async function loadWorkspaceRevisions () {
  if (!workspaceInfo) return

  // load up the revision list
  if (workspaceInfo.localFilesPath) {
    workspaceInfo.revisions = await beaker.workspaces.listChangedFiles(
      0,
      workspaceInfo.name,
      {shallow: true, compareContent: true}
    )
  } else {
    workspaceInfo.revisions = []
  }

  // count the number of additions, deletions, and modifications
  // TODO i don't know if this is necessary
  workspaceInfo.additions = workspaceInfo.revisions.filter(r => r.change === 'add')
  workspaceInfo.modifications = workspaceInfo.revisions.filter(r => r.change === 'mod')
  workspaceInfo.deletions = workspaceInfo.revisions.filter(r => r.change === 'del')

  // TODO
  // unset diff node if removed from revisions
  // if (currentDiffNode) {
  //   if (!workspaceInfo.revisions.find(r => r.path === currentDiffNode.path)) {
  //     currentDiffNode = null
  //   }
  // }

  // set the default diff node
  if (workspaceInfo.revisions.length) {
    // load the diff for the first revision
    await loadDiff(workspaceInfo.revisions[0])
    workspaceInfo.revisions[0].isOpen = true
  }
}

async function loadDiff (revision) {
  if (!revision) return

  // fetch the diff
  try {
    revision.diff = await beaker.workspaces.diff(0, workspaceInfo.name, revision.path)

    revision.diffDeletions = revision.diff.reduce((sum, el) => {
      if (el.removed) return sum + el.count
      return sum
    }, 0)

    revision.diffAdditions = revision.diff.reduce((sum, el) => {
      if (el.added) return sum + el.count
      return sum
    }, 0)
  } catch (e) {
    if (e.invalidEncoding) {
      revision.diff = {invalidEncoding: true}
    }
  }
}

async function loadReadme () {
  readmeElement = null

  const node = filesBrowser.getCurrentSource()
  if (node && node.hasChildren) {
    // try to find the readme.md file
    const readmeMdNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme.md')
    if (readmeMdNode) {
      // render the element
      const readmeMd = await archive.readFile(readmeMdNode._path, 'utf8')
      readmeElement = yo`<div class="readme markdown"></div>`
      readmeElement.innerHTML = markdownRenderer.render(readmeMd)
    } else {
      // try to find the readme file
      const readmeNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme')
      if (readmeNode) {
        // render the element
        const readme = await archive.readFile(readmeNode._path, 'utf8')
        readmeElement = yo`<div class="readme plaintext">${readme}</div>`
      }
    }

    // apply syntax highlighting
    if (readmeElement && window.hljs) {
      Array.from(readmeElement.querySelectorAll('code'), codeEl => {
        let cls = codeEl.className
        if (!cls.startsWith('language-')) return
        let lang = cls.slice('language-'.length)

        let res = hljs.highlight(lang, codeEl.textContent)
        if (res) codeEl.innerHTML = res.value
      })
    }
  }

  render()
}

// rendering
// =

function render () {
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper library-view builtin-wrapper">
        <div class="builtin-main" style="margin-left: 0; width: 100%">
          <div class="builtin-header">
            <div class="container">
              ${renderInfo()}
              ${renderTabs()}
            </div>
          </div>

          ${renderView()}

          ${error ? error.toString() : ''}
        </div>
      </div>
    `
  )
}

function renderView () {
  switch (activeView) {
    case 'files':
      return renderFilesView()
    case 'settings':
      return renderSettingsView()
    case 'revisions':
      return renderRevisionsView()
    case 'network':
      return renderNetworkView()
    case 'preview':
      return renderPreviewView()
    default:
      return yo`<div class="view">Loading...</div>`
  }
}

function renderFilesView () {
  return yo`
    <div class="container">
      <div class="view files">
        ${filesBrowser ? filesBrowser.render() : ''}
        ${readmeElement ? readmeElement : ''}
      </div>
    </div>
  `
}

function renderSettingsView () {
  const isOwner = archive.info.isOwner

  var titleEl = isOwner && settingsEditValues.title !== false
    ? yo`<td><input id="edit-title" onkeyup=${e => onKeyupSettingsEdit(e, 'title')} value=${settingsEditValues.title} type="text"/></td>`
    : yo`
      <td>
        ${getSafeTitle()}
        ${isOwner
          ? yo`
            <button class="btn plain" onclick=${e => onClickSettingsEdit(e, 'title')}>
              <i class="fa fa-pencil"></i>
            </button>`
          : ''}
      </td>`

  var descEl = isOwner && settingsEditValues.description !== false
    ? yo`<td><input id="edit-description" onkeyup=${e => onKeyupSettingsEdit(e, 'description')} value=${settingsEditValues.description} type="text"/></td>`
    : yo`
      <td>
        ${getSafeDesc()}
        ${isOwner
          ? yo`
            <button class="btn plain" onclick=${e => onClickSettingsEdit(e, 'description')}>
              <i class="fa fa-pencil"></i>
            </button>`
          : ''}
      </td>`

  return yo`
    <div class="container">
      <div class="settings view">
        <table>
          <tr><td class="label">Title</td>${titleEl}</tr>
          <tr><td class="label">Description</td>${descEl}</tr>
          <tr><td class="label">Size</td><td>${prettyBytes(archive.info.size)}</td></tr>
          <tr><td class="label">Last Updated</td><td>${archive.info.mtime ? niceDate(archive.info.mtime) : ''}</td></tr>
          <tr><td class="label">Editable</td><td>${archive.info.isOwner ? 'Yes' : 'No'}</td></tr>
        </table>
      </div>
    </div>
  `
}

function renderPreviewView () {
  return yo`
    <div class="view preview">
      ${workspaceInfo && workspaceInfo.localFilesPath
        ? yo`<iframe src="workspace://${workspaceInfo.name}"/>`
        : 'Set up your workspace first'
      }
    </div>
  `
}

function renderNetworkView () {
  let progressLabel = ''
  let progressCls = ''
  let seedingIcon = ''
  let seedingLabel = ''

  const {networked, isSaved, expiresAt} = archive.info.userSettings
  const {progress} = archive
  const progressPercentage = `${progress.current}%`
  let downloadedBytes = (archive.info.size / progress.blocks) * progress.downloaded

  if (progress.isComplete) {
    progressLabel = 'All files downloaded'
  } else if (progress.isDownloading) {
    progressLabel = 'Downloading files'
    progressCls = 'active'
  } else {
    progressLabel = 'Download paused'
  }

  if (isSaved && networked) {
    seedingIcon = 'pause'
    seedingLabel = 'Stop seeding these files'
    progressLabel += ', seeding files'
    progressCls += ' green'
  } else {
    seedingIcon = 'arrow-up'
    seedingLabel = 'Seed these files'
  }

  return yo`
    <div class="container">
      <div class="view network">
        <div class="section">
          <h2 class="subtitle-heading">Download status</h2>

          <progress value=${progress.current} max="100">
            ${progress.current}
          </progress>

          <div class="download-status">
            <div class="progress-ui ${progressCls}">
              <div style="width: ${progressPercentage}" class="completed">
                ${progressPercentage}
              </div>

              <div class="label">${progressLabel}</div>
            </div>

            <button class="btn transparent tooltip-container" data-tooltip=${seedingLabel} onclick=${onToggleSeeding}>
              <i class="fa fa-${seedingIcon}"></i>
            </button>
          </div>
        </div>

        <div class="section">
          <h2 class="subtitle-heading">Network activity (last hour)</h2>

          ${renderPeerHistoryGraph(archive.info)}
        </div>
      </div>
    </div>
  `
}

function renderRevisionsView () {
  if (!workspaceInfo || !workspaceInfo.revisions.length) {
    return yo`
      <div class="container">
        <div class="view">
          <em>No unpublished revisions</em>
        </div>
      </div>
    `
  }

  const renderRevisionContent = rev => {
    let el = ''

    if (!rev.isOpen) {
      return ''
    } else if (rev.diff && rev.diff.invalidEncoding) {
      el = yo`
        <div class="binary-diff-placeholder">
<code>1010100111001100
1110100101110100
1001010100010111</code>
          </div>`
    } else if (rev.diff) {
      el = renderDiff(rev.diff)
    } else {
      el = yo`
        <div class="loading">
          <p>Loading diff...</p>
          <div class="spinner"></div>
        </div>`
    }

    return yo`<div class="revision-content">${el}</div>`
  }

  const renderRevision = rev => (
    yo`
      <li class="revision" onclick=${() => onToggleRevisionCollapsed(rev)}>
        <div class="revision-header ${rev.isOpen ? '' : 'collapsed'}">
          <div class="revision-type ${rev.change}"></div>

          <code class="path">
            ${rev.type === 'file' ? rev.path.slice(1) : rev.path}
          </code>

          ${rev.diffAdditions
            ? yo`<div class="changes-count additions">+${rev.diffAdditions}</div>`
            : ''
          }

          ${rev.diffDeletions
            ? yo`<div class="changes-count deletions">-${rev.diffDeletions}</div>`
            : ''
          }

          <div class="actions">
            <button class="ignore-btn btn plain tooltip-container" data-tooltip="Add to .datignore">
              <i class="fa fa-eye-slash"></i>
            </button>

            <div class="btn-group">
              <a
                onclick=${(e) => e.stopPropagation()}
                href="workspace://${workspaceInfo.name}${rev.path}"
                target="_blank"
                class="btn tooltip-container"
                data-tooltip="View file">
                View
              </a>

              <button class="btn tooltip-container" data-tooltip="Revert">
                <i class="fa fa-undo"></i>
              </button>

              <button class="btn tooltip-container" data-tooltip="Publish">
                <i class="fa fa-check"></i>
              </button>
            </div>

            <div class="btn plain">
              <i class="fa fa-chevron-${rev.isOpen ? 'down' : 'up'}"></i>
            </div>
          </div>
        </div>

        ${renderRevisionContent(rev)}
      </li>
    `
  )

  const revisions = workspaceInfo.revisions
  const {additions, modifications, deletions} = workspaceInfo

  return yo`
    <div class="container">
      <div class="view revisions">
        <div class="revisions-header">
          <div>
            Showing
            <span class="revisions-summary">
              ${revisions.length} ${pluralize(revisions.length, 'changed file')}
            </span>
          </div>

          <div>Jump to...<i class="fa fa-caret-down"></i></div>

          <button class="btn success publish" onclick=${onPublish}>
            Publish all revisions
          </button>
        </div>

        ${revisions.length
          ? yo`<ul class="revisions-list">${revisions.map(renderRevision)}</ul>`
          : ''
        }
      </div>
    </div>
  `
}

function renderInfo () {
  return yo`
    <div class="info-container">
      <div class="info">
        <a href="beaker://library" class="back-link">
          <i class="fa fa-angle-double-left"></i>
        </a>

        <a href=${archive.info.url} class="title" target="_blank">
          ${getSafeTitle()}
        </a>

        <p class="description">
          ${getSafeDesc()}
        </p>
      </div>

      ${renderActions()}

      ${renderMetadata()}
    </div>
  `
}

function renderTabs () {
  let baseUrl = `beaker://library/${archive.url}`
  return yo`
    <div class="tabs">
      <a href=${baseUrl} onclick=${e => onChangeView(e, 'files')} class="tab ${activeView === 'files' ? 'active' : ''}">
        Files
      </a>

      ${workspaceInfo
        ? yo`
          <a href=${baseUrl + '#revisions'} onclick=${e => onChangeView(e, 'revisions')} class="tab ${activeView === 'revisions' ? 'active' : ''}">
            Revisions
            ${workspaceInfo.revisions && workspaceInfo.revisions.length
              ? yo`<span class="revisions-indicator"></span>`
              : ''
            }
          </a>`
        : ''
      }

      ${workspaceInfo && workspaceInfo.localFilesPath
        ? yo`
          <a href=${baseUrl + '#preview'} onclick=${e => onChangeView(e, 'preview')} class="tab ${activeView === 'preview' ? 'active' : ''}">
            Preview
          </a>`
        : ''
      }

      <a href=${baseUrl + '#network'} onclick=${e => onChangeView(e, 'network')} class="tab ${activeView === 'network' ? 'active' : ''}">
        Network
      </a>

      <a href=${baseUrl + '#settings'} onclick=${e => onChangeView(e, 'settings')} class="tab ${activeView === 'settings' ? 'active' : ''}">
        Details
      </a>
    </div>
  `
}

function renderMetadata () {
  return yo`
    <div class="metadata">
      <div>${prettyBytes(archive.info.size)}</div>

      <span class="separator">―</span>

      <div>${archive.info.peers} ${pluralize(archive.info.peers, 'peer')}</div>

      <span class="separator">―</span>

      <div class="url-info">
        <a href=${archive.info.url} class="url" target="_blank">${shortenHash(archive.info.url)}</a>
        <button class="btn plain tooltip-container" data-tooltip="Copy URL" onclick=${onCopyUrl}>
          <i class="fa fa-clipboard"></i>
        </button>
      </div>
    </div>
  `
}

function renderActions () {
  return yo`
    <div class="actions">
      ${workspaceInfo && workspaceInfo.localFilesPath
        ? yo`
          <span class="path" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
            ${workspaceInfo.localFilesPath}
          </span>`
        : ''
      }

      ${renderEditButton()}

      <button class="btn">
        <i class="fa fa-ellipsis-v"></i>
      </button>
    </div>
  `
}

function renderEditButton () {
  if (workspaceInfo && workspaceInfo.localFilesPath) {
    return yo`
      <button class="btn" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
        <i class="fa fa-pencil"></i>
        Edit
      </button>
    `
  } else {
    return yo`
      <button class="btn" onclick=${onEdit}>
        <i class="fa fa-pencil"></i>
        ${!archive.info.isOwner ? 'Fork & ' : ''}Edit
      </button>
    `
  }
}

// events
// =

async function onChangeView (e, view) {
  e.preventDefault()
  e.stopPropagation()

  // update state
  activeView = view
  window.history.pushState('', {}, e.currentTarget.getAttribute('href'))

  if (view === 'files') {
    // setup files view
    await archiveFsRoot.readData({maxPreviewLength: 1e5})
    await filesBrowser.setCurrentSource(archiveFsRoot, {suppressEvent: true})
  }

  render()
}

async function onToggleRevisionCollapsed (rev) {
  rev.isOpen = !rev.isOpen

  // fetch the diff it hasn't been loaded yet
  if (!rev.diff) {
    // render loading state
    rev.isLoadingDiff = true
    render()

    await loadDiff(rev)
  }

  render()
}

async function onPublish (rev) {
  if (rev) {
    // TODO Publish the specified revision
  } else {
    // publish all of the revisions
    const paths = workspaceInfo.revisions.map(rev => rev.path)

    if (!confirm(`Publish ${paths.length} ${pluralize(paths.length, 'change')}`)) return
    await beaker.workspaces.publish(0, workspaceInfo.name, {paths})

    // TODO reload the revisions tab
  }
}


async function onSetCurrentSource (node) {
  let path = archive.url
  if (node._path) {
    path += node._path
  }

  // if it's a file, load the preview
  if (node && node.type === 'file') {
    await node.readData({maxPreviewLength: 1e5})
  }
  loadReadme()

  window.history.pushState('', {}, `beaker://library/${path}`)
}

function onOpenFolder (path) {
  beaker.browser.openFolder(path)
}

function onCopyUrl () {
  if (archive.info) {
    writeToClipboard(archive.info.url)
    toast.create('URL copied to clipboard')
  }
}

async function onToggleSeeding () {
  const {isOwner} = archive.info
  const {networked, isSaved} = archive.info.userSettings
  const newNetworkedStatus = !networked

  if (isOwner) {
    try {
      await archive.configure({networked: newNetworkedStatus})
      archive.info.userSettings.networked = newNetworkedStatus
    } catch (e) {
      toast.create('Something went wrong', 'error')
      return
    }
  } else {
    if (isSaved) {
      await beaker.archives.remove(archive.url)
      archive.info.userSettings.isSaved = false
    } else {
      await beaker.archives.add(archive.url)
      archive.info.userSettings.isSaved = true
    }
  }
  render()
}

async function onEdit () {
  let publishTargetUrl = archive.url

  // fork first if not the owner
  if (!archive.info.isOwner) {
    const a = await DatArchive.fork(archive.url, {prompt: false})
    publishTargetUrl = a.url
  }

  // get an available path for a directory
  const basePath = await beaker.browser.getSetting('workspace_default_path')
  const defaultPath = await beaker.browser.getDefaultLocalPath(basePath, archive.info.title)

  // open the create workspace popup
  const localFilesPath = await workspacePopup.create(defaultPath)

  if (!workspaceInfo) {
    workspaceInfo = await beaker.workspaces.create(0, {localFilesPath, publishTargetUrl})
  } else {
    // set the localFilesPath
    await beaker.workspaces.set(0, workspaceInfo.name, {localFilesPath})
  }

  await beaker.workspaces.setupFolder(0, workspaceInfo.name)
  setupWorkspaceListeners()

  window.history.pushState('', {}, `beaker://library/${publishTargetUrl}`)
  await setup()
  onOpenFolder(localFilesPath)
  render()
}

function onClickOutsideSettingsEditInput (e) {
  if (e.target.tagName === 'INPUT') return

  // stop editing settings
  for (var k in settingsEditValues) {
    settingsEditValues[k] = false
  }
  render()
}

async function onKeyupSettingsEdit (e, attr) {
  if (e.keyCode == 13) {
    // enter-key
    await archive.configure({[attr]: settingsEditValues[attr]})
    Object.assign(archive.info, {[attr]: settingsEditValues[attr]})
    settingsEditValues[attr] = false
    render()
  } else if (e.keyCode == 27) {
    // escape-key
    settingsEditValues[attr] = false
    render()
  } else {
    settingsEditValues[attr] = e.target.value
  }
}

function onClickSettingsEdit (e, attr) {
  e.preventDefault()
  e.stopPropagation()

  // stop editing other settings
  for (var k in settingsEditValues) {
    settingsEditValues[k] = false
  }

  // update state
  settingsEditValues[attr] = archive.info[attr]
  render()

  // focus the element
  try {
    let el = document.querySelector(`#edit-${attr}`)
    el.focus()
    el.select()
  } catch (e) {
    console.debug('Failed to focus the edit element', e)
  }
}

async function onFilesChanged () {
  // update files
  const currentNode = filesBrowser.getCurrentSource()
  try {
    await currentNode.readData()
    filesBrowser.rerender()
  } catch (e) {
    console.debug('Failed to rerender files on change, likely because the present node was deleted', e)
  }

  // update readme
  loadReadme()

  // update revisions
  await loadWorkspaceRevisions()
  if (activeView === 'revisions') {
    render()
  }
}

async function onWorkspaceChanged () {
  await loadWorkspaceRevisions()
  render()
}

function onNetworkChanged (e) {
  if (e.details.url === archive.url) {
    var now = Date.now()
    archive.info.peers = e.details.peerCount
    var lastHistory = archive.info.peerHistory.slice(-1)[0]
    if (lastHistory && (now - lastHistory.ts) < 10e3) {
      // if the last datapoint was < 10s ago, just update it
      lastHistory.peers = e.details.peerCount
    } else {
      archive.info.peerHistory.push({ts: now, peers: e.details.peerCount})
    }
    render()
  }
}

function onPopState (e) {
  readViewStateFromUrl()
}

// helpers
// =

// this method is only called on initial load and on the back button
// it mimics some of the behaviors of the click functions
//   (eg onChangeView and the files-browser onClickNode)
// but it works entirely by reading the current url
async function readViewStateFromUrl () {

  // active view
  let oldView = activeView
  let hash = window.location.hash
  if (hash.startsWith('#')) hash = hash.slice(1)
  if (hash) {
    activeView = hash
  } else {
    activeView = 'files'
  }
  if (oldView !== activeView) {
    render()
  }

  try {
    var node
    var urlp = new URL(window.location.pathname.slice(1))
    var pathParts = urlp.pathname.split('/').filter(Boolean)

    // select the archive
    node = archiveFsRoot
    await node.readData({maxPreviewLength: 1e5})

    // now select the folders
    let pathPart
    while ((pathPart = pathParts.shift())) {
      node = node.children.find(node => node.name === pathPart)
      await node.readData({maxPreviewLength: 1e5})
    }

    await filesBrowser.setCurrentSource(node, {suppressEvent: true})
    loadReadme()
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}

// helper to rerender the peer history graph
function updateGraph () {
  if (activeView === 'network') {
    var el = document.querySelector(`#history-${archive.key}`)
    yo.update(el, renderPeerHistoryGraph(archive.info))
  }
}

function getSafeTitle () {
  return (archive.info.title || '').trim() || 'Untitled'
}

function getSafeDesc () {
  return (archive.info.description || '').trim() || yo`<em>No description</em>`
}
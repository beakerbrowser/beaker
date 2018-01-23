/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import slugify from 'slugify'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import FilesBrowser from '../com/files-browser2'
import renderDiff from '../com/diff'
import renderGraph from '../com/peer-history-graph'
import * as toast from '../com/toast'
import * as workspacePopup from '../com/library-workspace-popup'
import {pluralize, shortenHash} from '../../lib/strings'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// globals
// =

var activeView = 'files'
var activeMode = 'live'
var archive
var archiveFsRoot
var filesBrowser

var workspaceInfo
let diff
let diffAdditions = 0
let diffDeletions = 0
let currentDiffNode
let numCheckedRevisions

var error

// main
// =

setup()
async function setup () {
  // try {
    // load data
    let url = window.location.pathname.slice(1)
    archive = new LibraryDatArchive(url)

    // set up download progress
    await archive.setup()
    await archive.startMonitoringDownloadProgress()
    archive.progress.addEventListener('changed', render)

    archiveFsRoot = new FSArchive(null, archive.info)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource
    await readSelectedPathFromURL()

    document.title = `Library - ${archive.info.title || 'Untitled'}`

    // wire up events
    window.addEventListener('popstate', onPopState)
  // } catch (e) {
  //   error = e
  // }

  // fetch workspace info for this archive
  workspaceInfo = await beaker.workspaces.get(0, archive.info.url)
  if (workspaceInfo) {
    if (workspaceInfo.localFilesPath) {
      workspaceInfo.revisions = await beaker.workspaces.listChangedFiles(
        0,
        workspaceInfo.name,
        {shallow: true, compareContent: true}
      )
    } else {
      workspaceInfo.revisions = []
    }

    // set the default diff node
    if (workspaceInfo.revisions.length) {
      currentDiffNode = workspaceInfo.revisions[0]
      await loadCurrentDiff(currentDiffNode)
    }
  }

  render()
}

async function loadCurrentDiff (revision) {
  if (!revision) {
    diff = ''
    currentDiffNode = null
    diffAdditions = 0
    diffDeletions = 0
    return
  }

  // fetch the diff
  try {
    diff = await beaker.workspaces.diff(0, workspaceInfo.name, revision.path)

    diffDeletions = diff.reduce((sum, el) => {
      if (el.removed) return sum + el.count
      return sum
    }, 0)

    diffAdditions = diff.reduce((sum, el) => {
      if (el.added) return sum + el.count
      return sum
    }, 0)
  } catch (e) {
    if (e.invalidEncoding) {
      diff = {invalidEncoding: true}
    }
  }
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
              ${renderModeToggle()}
            </div>
          </div>

          <div class="container">${renderView()}</div>

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
    default:
      return yo`<div class="view">Loading...</div>`
  }
}

function renderFilesView () {
  return yo`
    <div class="view files">
      ${filesBrowser ? filesBrowser.render() : ''}
    </div>
  `
}

function renderSettingsView () {
  return yo`
    <div class="settings view">
      <h2>Settings</h2>
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
    <div class="view network">
      <div class="section">
        <h2>Download status</h2>

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
    </div>
  `
}

function renderRevisionsView () {
  if (!workspaceInfo.revisions.length) {
    return yo`
      <div class="view">
        <em>No unpublished revisions</em>
      </div>
    `
  }

  const renderRev = node => (
    yo`
      <li class="${currentDiffNode && node.path === currentDiffNode.path ? 'selected' : ''}" onclick=${() => onClickChangedNode(node)} title=${node.path}>
        <span class="path">${node.type === 'file' ? node.path.slice(1) : node.path}</span>
        <input
          type="checkbox"
          checked=${!!node.checked}
          onclick=${e => onToggleChangedNodeChecked(e, node)}
        />
      </li>
    `
  )

  return yo`
    <div class="view revisions">
      <div class="revisions-sidebar">
        <ul class="revisions-list">
          ${workspaceInfo.revisions.map(renderRev)}
        </ul>
      </div>

      <div class="revisions-content">
        ${currentDiffNode
          ? yo`
            <div class="revisions-content-header">
              <i class="fa fa-file-text-o"></i>

              <span class="path">
                ${currentDiffNode.type === 'file' ? currentDiffNode.path.slice(1) : currentDiffNode.path}
              </span>

              <div class="changes-count-container">
                <span class="additions-count">${diffAdditions ? `+${diffAdditions}` : ''}</span>
                <span class="deletions-count">${diffDeletions ? `-${diffDeletions}` : ''}</span>
              </div>
            </div>`
          : ''
        }

        ${renderRevisionsContent()}
      </div>
    </div>
  `
}

function renderRevisionsContent () {
  if (diff && diff.invalidEncoding) {
    return yo`
      <div class="binary-diff-placeholder">
        <code>1010100111001100
1110100101110100
1001010100010111</code>
      </div>
    `
  } else if (diff) {
    return renderDiff(diff)
  } else {
    return 'butt'
  }
}


function renderInfo () {
  return yo`
    <div class="info-container">
      <div class="info">
        <a href=${archive.info.url} class="title" target="_blank">
          ${archive.info.title || 'Untitled'}
        </a>

        <p class="description">
          ${archive.info.description || yo`<em>No description</em>`}
        </p>
      </div>

      ${renderActions()}

      ${renderMetadata()}
    </div>
  `
}

function renderTabs () {
  return yo`
    <div class="tabs">
      <div onclick=${e => onChangeView('files')} class="tab ${activeView === 'files' ? 'active' : ''}">
        Files
      </div>

      ${workspaceInfo
        ? yo`
          <div onclick=${e => onChangeView('revisions')} class="tab ${activeView === 'revisions' ? 'active' : ''}">
            Revisions
            ${workspaceInfo.revisions && workspaceInfo.revisions.length
              ? yo`<span class="revisions-indicator"></span>`
              : ''
            }
          </div>`
        : ''
      }

      <div onclick=${e => onChangeView('network')} class="tab ${activeView === 'network' ? 'active' : ''}">
        Network
      </div>

      <div onclick=${e => onChangeView('settings')} class="tab ${activeView === 'settings' ? 'active' : ''}">
        Details
      </div>
    </div>
  `
}

function renderModeToggle () {
  if (!workspaceInfo) return ''

  return yo`
    <div class="btn-group mode-toggle">
      <button onclick=${() => onChangeMode('preview')} class="btn small mode ${activeMode === 'preview' ? 'active' : ''}">
        Preview
      </button>
      <button onclick=${() => onChangeMode('live')} class="btn small mode ${activeMode === 'live' ? 'active' : ''}">
        Live
      </button>
    </div>
  `
}

function renderMetadata () {
  let url = archive.info.url
  let urlLabel = shortenHash(archive.info.url)

  if (activeMode === 'preview' && workspaceInfo) {
    url = `workspace://${workspaceInfo.name}`
    urlLabel =  url
  }

  return yo`
    <div class="metadata">
      <div>${prettyBytes(archive.info.size)}</div>

      <span class="separator">―</span>

      <div>${archive.info.peers} ${pluralize(archive.info.peers, 'peer')}</div>

      <span class="separator">―</span>

      <div class="url-info">
        <a href=${url} class="url" target="_blank">${urlLabel}</a>
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

function onChangeView (view) {
  activeView = view
  render()
}

function onChangeMode (mode) {
  activeMode = mode
  render()
}

async function onClickChangedNode (node) {
  currentDiffNode = node
  await loadCurrentDiff(node)
  render()
}

async function onSetCurrentSource (node) {
  // if (!node) {
  //   window.history.pushState('', {}, `beaker://library/${archive.url}`)
  //   return
  // }

  let path = archive.url
  if (node._path) {
    path += node._path
  }

  // if it's a file, load the preview
  if (node && node.type === 'file') {
    await node.readData()
  }

  window.history.pushState('', {}, `beaker://library/${path}`)
}

function onOpenFolder (path) {
  beaker.workspaces.openFolder(path)
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

  // slugify archive name
  const path = slugify(archive.info.title || 'untitled').toLowerCase()

  try {
    const localFilesPath = await workspacePopup.create(path)
    await beaker.workspaces.create(0, {localFilesPath, publishTargetUrl})

    window.history.pushState('', {}, `beaker://library/${publishTargetUrl}`)
    await setup()
    onOpenFolder(localFilesPath)
    render()
  } catch (e) {
    // ignore
    console.log(e)
  }
}

function onPopState (e) {
  readSelectedPathFromURL()
}

// helpers
// =

async function readSelectedPathFromURL () {
  try {
    var node
    var urlp = new URL(window.location.pathname.slice(1))
    var pathParts = urlp.pathname.split('/').filter(Boolean)

    // select the archive
    node = archiveFsRoot
    await node.readData()

    // now select the folders
    let pathPart
    while ((pathPart = pathParts.shift())) {
      node = node.children.find(node => node.name === pathPart)
      await node.readData()
    }

    await filesBrowser.setCurrentSource(node, {suppressEvent: true})
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}
/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FSArchive} from 'beaker-virtual-fs'
import FilesBrowser from '../com/files-browser2'
import * as toast from '../com/toast'
import {pluralize, shortenHash} from '../../lib/strings'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// globals
// =

var activeView = 'files'
var activeMode = 'live'
var archive
var archiveInfo
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
    archive = new DatArchive(url)
    archiveInfo = await archive.getInfo()
    archiveFsRoot = new FSArchive(null, archiveInfo)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource
    await readSelectedPathFromURL()

    document.title = `Library - ${archiveInfo.title || 'Untitled'}`

    // wire up events
    window.addEventListener('popstate', onPopState)
  // } catch (e) {
  //   error = e
  // }

  // fetch workspace info for this archive
  workspaceInfo = await beaker.workspaces.get(0, archiveInfo.url)
  if (workspaceInfo && workspaceInfo.localFilesPath) {
    workspaceInfo.revisions = await beaker.workspaces.listChangedFiles(
      0,
      workspaceInfo.name,
      {shallow: true, compareContent: true}
    )
  } else {
    workspaceInfo.revisions = []
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
    diff = await beaker.workspaces.diff(0, currentWorkspaceName, revision.path)

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

function renderRevisionsView () {
  if (!workspaceInfo.revisions.length) {
    return yo`
      <div class="view">
        <em>No unpublished revisions</em>
      </div>
    `
  }

  const additions = workspaceInfo.revisions.filter(r => r.change === 'add')
  const modifications = workspaceInfo.revisions.filter(r => r.change === 'mod')
  const deletions = workspaceInfo.revisions.filter(r => r.change === 'del')

  const renderRev = node => (
    yo`
      <li class="${currentDiffNode && node.path === currentDiffNode.path ? 'selected' : ''}" onclick=${() => onClickChangedNode(node)} title=${node.path}>
        <code class="path">${node.type === 'file' ? node.path.slice(1) : node.path}</code>
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
        ${renderMetadata()}

        ${additions.length ? yo`
          <div>
            <div class="revisions-header additions">
              <h3>Additions</h3>
              <span class="count">${additions.length}</span>
            </div>

            <ul class="revisions-list">
              ${additions.map(renderRev)}
            </ul>
          </div>
        ` : ''}

        ${modifications.length ? yo`
          <div>
            <div class="revisions-header modifications">
              <h3>Modifications</h3>
              <span class="count">${modifications.length}</span>
            </div>

            <ul class="revisions-list">
              ${modifications.map(renderRev)}
            </ul>
          </div>
        ` : ''}

        ${deletions.length ? yo`
          <div>
            <div class="revisions-header deletions">
              <h3>Deletions</h3>
              <span class="count">${deletions.length}</span>
            </div>

            <ul class="revisions-list">
              ${deletions.map(renderRev)}
            </ul>
          </div>
        ` : ''}
        ${!(additions.length || modifications.length || deletions.length)
          ? yo`<em>No revisions</em>`
          : ''}

        ${renderActions()}
      </div>

      <div class="revisions-content">
        ${currentDiffNode ? yo`
          <div class="revisions-content-header">
            <div>
              <i class="fa fa-file-text-o"></i>
              <code class="path">
                ${currentDiffNode.type === 'file' ? currentDiffNode.path.slice(1) : currentDiffNode.path}
              </code>
            </div>

            <div class="changes-count-container">
              <span class="additions-count">${diffAdditions ? `+${diffAdditions}` : ''}</span>
              <span class="deletions-count">${diffDeletions ? `-${diffDeletions}` : ''}</span>
          </div>` : ''}

        ${renderRevisionsContent()}
      </div>
    </div>
  `
}

function renderRevisionsContent () {
  if (diff && diff.invalidEncoding) {
    return yo`
      <div class="binary-diff-placeholder">
        <code>
          1010100111001100
          1110100101110100
          1001010100010111
        </code>
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
        <a href=${archiveInfo.url} class="title">
          ${archiveInfo.title || 'Untitled'}
        </a>

        <p class="description">
          ${archiveInfo.description || yo`<em>No description</em>`}
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
        <i class="fa fa-code"></i>
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
        <i class="fa fa-cogs"></i>
        Settings
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
  let url = archiveInfo.url
  let urlLabel = shortenHash(archiveInfo.url)

  if (activeMode === 'preview' && workspaceInfo) {
    url = `workspace://${workspaceInfo.name}`
    urlLabel =  url
  }

  return yo`
    <div class="metadata">
      <div>${prettyBytes(archiveInfo.size)}</div>

      <span class="separator">―</span>

      <div>${archiveInfo.peers} ${pluralize(archiveInfo.peers, 'peer')}</div>

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
      ${renderEditButton()}

      <button class="btn">
        <i class="fa fa-ellipsis-v"></i>
      </button>
    </div>
  `
}

function renderEditButton () {
  if (workspaceInfo && workspaceInfo.localFilesPath) return ''

  if (archiveInfo.isOwner) {
    return yo`
      <button class="btn" onclick=${onEdit}>
        <i class="fa fa-pencil"></i>
        Edit
      </button>
    `
  }
  return yo`
    <button class="btn" onclick=${onForkAndEdit}>
      <i class="fa fa-pencil"></i>
      Fork & Edit
    </button>
  `
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

async function onSetCurrentSource (node) {
  let path = archive.url
  if (node._path) {
    path += node._path
  }

  // if it's a file, load the preview
  if (node.type === 'file') {
    await node.readData()
  }

  window.history.pushState('', {}, `beaker://library/${path}`)
}

function onCopyUrl () {
  if (archiveInfo) {
    writeToClipboard(archiveInfo.url)
    toast.create('URL copied to clipboard')
  }
}

function onEdit () {
  // TODO
}

function onForkAndEdit () {
  // TODO
}

async function onCreateWorkspace () {
  workspaceInfo = await beaker.workspaces.create(0)
  render()
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
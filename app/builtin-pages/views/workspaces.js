/* globals beaker */

import yo from 'yo-yo'
import {pluralize} from '../../lib/strings'
import * as createWorkspacePopup from '../com/create-workspace-popup'
import renderSidebar from '../com/sidebar'
import renderGearIcon from '../icon/gear-small'

// main
// =
let allWorkspaces = []
let currentWorkspaceName
let workspaceInfo
let diff
let activeTab = 'revisions'

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function (type) {
  var orig = window.history[type]
  return function () {
    var rv = orig.apply(this, arguments)
    var e = new Event(type.toLowerCase())
    e.arguments = arguments
    window.dispatchEvent(e)
    return rv
  }
}
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

setup()
async function setup () {
  allWorkspaces = await beaker.workspaces.list(0)
  // add extra metadata to the workspaces
  await Promise.all(allWorkspaces.map(async (w) => {
    const revisions = await beaker.workspaces.listChangedFiles(0, w.name, {shallow: true}).length
    w.numRevisions = revisions ? revisions.length : 0
    return w
  }))
  await loadCurrentWorkspace()

  window.addEventListener('pushstate', loadCurrentWorkspace)
  window.addEventListener('popstate', loadCurrentWorkspace)

  render()
}

async function loadCurrentWorkspace () {
  currentWorkspaceName = parseURLWorkspaceName()
  if (currentWorkspaceName) {
    workspaceInfo = await beaker.workspaces.get(0, currentWorkspaceName)
    workspaceInfo.revisions = await beaker.workspaces.listChangedFiles(0, currentWorkspaceName, {shallow: true, compareContent: true})
  } else {
    workspaceInfo = null
  }
  render()
}

function parseURLWorkspaceName () {
  return window.location.pathname.replace(/\//g, '')
}

// events
// =

async function onCreateWorkspace () {
  const {name, url, path} = await createWorkspacePopup.create()
  await beaker.workspaces.set(0, name, {localFilesPath: path, publishTargetUrl: url})
  // TODO: we should tell the user if a workspace name is already in use, so
  // they don't accidentally overwrite an existing workspace -tbv
}

function onOpenWorkspace (name) {
  currentWorkspaceName = name
  history.pushState({}, null, 'beaker://workspaces/' + name)
}

async function onPublishChanges () {
  await beaker.workspaces.publish(0, currentWorkspaceName)
  loadCurrentWorkspace()
}

async function onRevertChanges () {
  await beaker.workspaces.revert(0, currentWorkspaceName)
  loadCurrentWorkspace()
}

function onOpenInFinder () {
  // TODO
}

function onChangeTab (tab) {
  activeTab = tab
  render()
}

async function onClickChangedNode (node) {
  // TODO: waiting for this to be implemented -tbv
  // diff = await beaker.workspaces.diff(0, currentWorkspaceName, node.path)
  render()
}

// rendering
// =

function render () {
  if (currentWorkspaceName.length && !workspaceInfo) render404()
  else if (!workspaceInfo) renderWorkspacesListing()
  else renderWorkspace()
}

function renderWorkspacesListing () {
  yo.update(document.querySelector('.workspaces-wrapper'), yo`
    <div class="builtin-wrapper workspaces-wrapper listing">
      ${renderSidebar('')}
      <div>
        <div class="builtin-sidebar">
          <h1>Workspaces</h1>

          <p>Manage your workspaces</p>
        </div>

        <div class="builtin-main">
          <div class="builtin-header fixed">
            <div class="actions">
              <button class="btn" onclick=${onCreateWorkspace} >
                New workspace
                <i class="fa fa-plus"></i>
              </button>
            </div>
          </div>

          <div>
            <ul class="workspaces">
              ${allWorkspaces.map(renderWorkspaceListItem)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  `)
}

function renderWorkspaceListItem (workspace) {
  return yo`
    <li class="workspace">
      <div>
        <img class="favicon" src="beaker-favicon:${workspace.publishTargetUrl}" />
        <span class="info">
          <a class="title" href="workspace://${workspace.name}">
            <code>workspace://${workspace.name}</code>
          </a>

          <div class="metadata">
            ${workspace.numRevisions} ${pluralize(workspace.numRevisions, 'unpublished change')}
            <span class="bullet">•</span>
            <code class="path" onclick=${onOpenInFinder}>${workspace.localFilesPath}</code>
          </div>
        </span>
      </div>

      <div class="buttons">
        <button class="btn" onclick=${e => onOpenWorkspace(workspace.name)}>
          Open workspace
        </button>
        <a title="Preview changes" href="workspace://${workspace.name}" class="btn">
          <i class="fa fa-external-link"></i>
        </a>
      </div>
    </li>
  `
}

function renderWorkspace () {
  yo.update(document.querySelector('.workspaces-wrapper'), yo`
    <div class="workspaces-wrapper builtin-wrapper workspace">
      ${renderHeader()}
      ${renderView()}
    </div>
  `)
}

function render404 () {
  yo.update(document.querySelector('.workspaces-wrapper'), yo`
    <div class="workspaces-wrapper not-found">
      <span class="name">workspace://${currentWorkspaceName}</span> does not exist

      <div class="links">
        <span onclick=${() => history.pushState({}, null, 'beaker://workspaces')}>
          « Back to all workspaces
        </span>
      </div>
    </div>
  `)
}

function renderHeader () {
  return yo`
    <div class="header">
      <div class="top">
        <div>
          <a href="workspace://${workspaceInfo.name}" class="name">
            workspace://${workspaceInfo.name}
          </a>
          <span onclick=${onOpenInFinder} class="local-path">${workspaceInfo.localPath}</span>
        </div>

        ${renderActions()}
      </div>

      <div class="bottom">
        ${renderTabs()}
        ${renderMetadata()}
      </div>
    </div>
  `
}

function renderTabs () {
  return yo`
    <div class="tabs">
      <div onclick=${e => onChangeTab('revisions')} class="tab ${activeTab === 'revisions' ? 'active' : ''}">
        <i class="fa fa-code"></i>
        Revisions
      </div>
      <div onclick=${e => onChangeTab('wizards')} class="tab ${activeTab === 'wizards' ? 'active' : ''}">
        <i class="fa fa-cube"></i>
        Wizards
      </div>
      <div onclick=${e => onChangeTab('settings')} class="tab ${activeTab === 'settings' ? 'active' : ''}">
        <i class="fa fa-cogs"></i>
        Settings
      </div>
    </div>
  `
}

function renderActions () {
  return yo`
    <div class="actions">
      <button onclick=${onRevertChanges} class="btn">
        Revert
        <i class="fa fa-undo"></i>
      </button>
      <button onclick=${onPublishChanges} class="btn success">Publish</button>
    </div>
  `
}

function renderMetadata () {
  return yo`
    <div class="metadata">
      ${workspaceInfo.revisions.length ? yo`
        <span class="changes-count">
          ${workspaceInfo.revisions.length} unpublished ${pluralize(workspaceInfo.revisions.length, 'change')}
        </span>
      ` : ''}
    </div>
  `
}

function renderView () {
  switch (activeTab) {
    case 'revisions':
      return renderRevisionsView()
    case 'wizards':
      return renderWizardsView()
    case 'settings':
      return renderSettingsView()
    default:
      return yo`<div class="view">Loading...</div>`
  }
}

function renderRevisionsView () {
  const additions = workspaceInfo.revisions.filter(r => r.change === 'add')
  const modifications = workspaceInfo.revisions.filter(r => r.change === 'mod')
  const deletions = workspaceInfo.revisions.filter(r => r.change === 'del')

  return yo`
    <div class="view revisions">
      <div class="revisions-sidebar">
        ${additions.length ? yo`
          <div>
            <div class="revisions-header additions">
              <h3>Additions</h3>
              <span class="count">${additions.length}</span>
            </div>

            <ul class="revisions-list">
              ${additions.map(a => yo`<li onclick=${() => onClickChangedNode(a)}>${a.path}</li>`)}
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
              ${modifications.map(m => yo`<li>${m.path}</li>`)}
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
              ${deletions.map(d => yo`<li>${d.path}</li>`)}
            </ul>
          </div>
        ` : ''}
        ${!(additions.length || modifications.length || deletions.length)
          ? yo`<em>No revisions</em>`
          : ''}
      </div>

      <div class="revisions-content">
        TODO
      </div>
    </div>
  `
}

function renderWizardsView () {
  return yo`
    <div class="view">
      TODO
    </div>
  `
}

function renderSettingsView () {
  return yo`
    <div class="view settings">
      <h2>Settings</h2>

      <p>
        <label for="title">Title</label>
        <input autofocus name="title" value=${workspaceInfo.title}/>
      </p>

      <p>
        <label for="desc">Description</label>
        <textarea name="desc">${workspaceInfo.description}</textarea>
      </p>

      <p>
        <label for="name">Local URL</label>
        <div class="name-input-container">
          <span class="protocol">workspaces://</span>
          <input name="name" value=${workspaceInfo.name}/>
          ${false ? yo`
            <span class="error">This URL is being used by another workspace</span>
          ` : ''}
        </div>
      </p>

      <p>
        <label for="title">Folder</label>
        <input name="title" type="file" directory value=${workspaceInfo.localPath}/>
      </p>
    </div>
  `
}
/* globals beaker */

import yo from 'yo-yo'
import {pluralize} from '../../lib/strings'
import renderGearIcon from '../icon/gear-small'

// main
// =
let workspaceInfo
let activeTab = 'revisions'

setup()
async function setup () {
  workspaceInfo = {
    namespace: 'blog',
    title: 'My blog',
    description: 'The source for my blog',
    origin: 'dat://cca6eb69a3ad6104ca31b9fee7832d74068db16ef2169eaaab5b48096e128342/',
    localPath: '/Users/tara/src/taravancil.com',
    revisions: {
      additions: ['test.txt', 'index.html'],
      deletions: ['/images/cat.png'],
      modifications: ['/test', '/app/index.js', '/app/butt.js']
    }
  }
  render()
}

// events
// =

function onPublishChanges () {
  // TODO
}

function onRevertChanges () {
  // TODO
}

function onOpenInFinder () {
  // TODO
}

function onChangeTab (tab) {
  activeTab = tab
  render()
}

// rendering
// =

function render () {
  yo.update(document.querySelector('.workspaces-wrapper'), yo`
    <div class="workspaces-wrapper builtin-wrapper">
      ${renderHeader()}
      ${renderView()}
    </div>
  `)
}

function renderHeader () {
  return yo`
    <div class="builtin-header header">
      <div class="top">
        <div>
          <a href="workspaces://${workspaceInfo.namespace}" class="namespace">
            workspaces://${workspaceInfo.namespace}
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
  const revisions = workspaceInfo.revisions
  const totalChangesCount = revisions.additions.length + revisions.modifications.length + revisions.deletions.length

  return yo`
    <div class="metadata">
      ${totalChangesCount ? yo`
        <span class="changes-count">
          ${totalChangesCount} unpublished ${pluralize(totalChangesCount, 'change')}
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
  return yo`
    <div class="view">
      TODO
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
        <label for="namespace">Local URL</label>
        <div class="namespace-input-container">
          <span class="protocol">workspaces://</span>
          <input name="namespace" value=${workspaceInfo.namespace}/>
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
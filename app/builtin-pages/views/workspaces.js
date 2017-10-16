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
    title: 'blog',
    origin: 'dat://cca6eb69a3ad6104ca31b9fee7832d74068db16ef2169eaaab5b48096e128342/',
    localPath: '/Users/tara/src/taravancil.com',
    revisions: {additions: [0, 1], deletions: [0, 1, 2], modifications: []}
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
      <div class="builtin-main">
        ${renderHeader()}
        ${renderView()}
      </div>
    </div>
  `)
}

function renderHeader () {
  return yo`
    <div class="header">
      <div class="top">
        <div>
          <a href="workspaces://${workspaceInfo.title}" class="title">
            workspaces://${workspaceInfo.title}
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
        <span class="icon revisions">${'</>'}</i>
        Revisions
      </div>
      <div onclick=${e => onChangeTab('wizards')} class="tab ${activeTab === 'wizards' ? 'active' : ''}">
        <i></i>
        Wizards
      </div>
      <div onclick=${e => onChangeTab('settings')} class="tab ${activeTab === 'settings' ? 'active' : ''}">
        ${renderGearIcon()}
        Settings
      </div>
    </div>
  `
}

function renderActions () {
  return yo`
    <div class="actions">
      <button onclick=${onRevertChanges} class="btn">Revert changes</button>
      <button onclick=${onPublishChanges} class="btn success">Publish changes</button>
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
    <div class="view">
      TODO
    </div>
  `
}
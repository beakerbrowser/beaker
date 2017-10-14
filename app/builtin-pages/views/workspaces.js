/* globals beaker */

import yo from 'yo-yo'
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
    revisions: []
  }
  render()
}

// events
// =

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
        <div class="view"></div>
      </div>
    </div>
  `)
}

function renderHeader () {
  return yo`
    <div class="header">
      <div class="top">
        <a href="workspaces://${workspaceInfo.title}" class="title">
          workspaces://${workspaceInfo.title}
        </a>
        <span onclick=${onOpenInFinder} class="local-path">${workspaceInfo.localPath}</span>
      </div>

      <div class="bottom">
        ${renderTabs()}
        ${renderActions()}
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
    </div>
  `
}
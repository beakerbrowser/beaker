import { ipcRenderer } from 'electron'

// exported api
// =

export function setup () {
  // attach site info override methods
  // - only allowed on internal pages
  if (window.location.protocol === 'beaker:') {
    window.locationbar.setSiteInfoOverride = setSiteInfoOverride
    window.locationbar.clearSiteInfoOverride = clearSiteInfoOverride
    window.locationbar.openUrl = openUrl
    window.locationbar.closeMenus = closeMenus
    window.locationbar.toggleLiveReloading = toggleLiveReloading
  }
}

function setSiteInfoOverride ({ title, url }) {
  ipcRenderer.sendToHost('site-info-override:set', { title, url })
}

function clearSiteInfoOverride () {
  ipcRenderer.sendToHost('site-info-override:clear')
}

function openUrl (url, {newTab} = {}) {
  ipcRenderer.sendToHost('open-url', {url, newTab})
}

function closeMenus () {
  ipcRenderer.sendToHost('close-menus')
}

function toggleLiveReloading () {
  ipcRenderer.sendToHost('toggle-live-reloading')
}

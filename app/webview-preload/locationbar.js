import { ipcRenderer } from 'electron'

// exported api
// =

export function setup () {
  // attach site info override methods
  // - only allowed on internal pages
  if (window.location.protocol === 'beaker:') {
    window.locationbar.setSiteInfoOverride = setSiteInfoOverride
    window.locationbar.clearSiteInfoOverride = clearSiteInfoOverride
    window.locationbar.closeMenus = closeMenus
  }
}

function setSiteInfoOverride ({ title, url }) {
  ipcRenderer.sendToHost('site-info-override:set', { title, url })
}

function clearSiteInfoOverride () {
  ipcRenderer.sendToHost('site-info-override:clear')
}

function closeMenus () {
  console.log('closing menus')
  ipcRenderer.sendToHost('close-menus')
}
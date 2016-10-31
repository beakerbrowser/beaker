import { ipcRenderer } from 'electron'

// exported api
// =

export function setup () {
  // attach site info override methods
  // TODO for now, only allow on beaker sites -prf
  if (window.location.protocol === 'beaker:') {
    window.locationbar.setSiteInfoOverride = setSiteInfoOverride
    window.locationbar.clearSiteInfoOverride = clearSiteInfoOverride
  }
}

function setSiteInfoOverride ({ title, url }) {
  ipcRenderer.sendToHost('site-info-override:set', { title, url })
}

function clearSiteInfoOverride () {
  ipcRenderer.sendToHost('site-info-override:clear')
}

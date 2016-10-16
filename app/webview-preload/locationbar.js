import { ipcRenderer } from 'electron'

// exported api
// =

export function setup () {
  // attach sublocation methods
  // TODO for now, only allow on beaker sites -prf
  if (window.location.protocol === 'beaker:') {
    window.locationbar.setSublocation = setSublocation
    window.locationbar.clearSublocation = clearSublocation
  }
}

function setSublocation ({ title, value }) {
  ipcRenderer.sendToHost('sublocation:set', { title, value })
}

function clearSublocation () {
  ipcRenderer.sendToHost('sublocation:clear')
}

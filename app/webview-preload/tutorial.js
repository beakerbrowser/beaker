import { ipcRenderer } from 'electron'

// exported api
// =

export function setup () {
  // attach site info override methods
  // - only allowed on internal pages
  if (window.location.protocol === 'beaker:') {
    window.beakerStartTutorial = () => ipcRenderer.sendToHost('tutorial:start')
  }
}
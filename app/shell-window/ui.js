import { ipcRenderer } from 'electron'
import * as tabs from './ui/tabs'

export function setup () {
  tabs.setup()
  ipcRenderer.on('window-event', onWindowEvent)
}

function onWindowEvent (event, type) {
  if (type == 'blur')
    document.body.classList.add('window-blurred')
  if (type == 'focus')
    document.body.classList.remove('window-blurred')
}
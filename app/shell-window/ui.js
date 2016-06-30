import { ipcRenderer } from 'electron'
import * as tabs from './ui/tabs'

export function setup () {
  if (window.process.platform == 'darwin') {
    document.body.classList.add('darwin')
  }

  tabs.setup()
  ipcRenderer.on('window-event', onWindowEvent)
}

function onWindowEvent (event, type) {
  console.log(event, type)
  if (type == 'blur')
    document.body.classList.add('window-blurred')
  if (type == 'focus')
    document.body.classList.remove('window-blurred')
  if (type == 'enter-full-screen')
    document.body.classList.add('fullscreen')
  if (type == 'leave-full-screen')
    document.body.classList.remove('fullscreen')
}
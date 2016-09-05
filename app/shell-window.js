import { remote, ipcRenderer } from 'electron'
import { setup as setupUI } from './shell-window/ui'
import importWebAPIs from './lib/fg/import-web-apis'
const { session } = remote

// setup UI
importWebAPIs()
// background-process need to know when shell-window is ready to accept commands
setupUI(() => {
  ipcRenderer.send('shell-window-ready')
})

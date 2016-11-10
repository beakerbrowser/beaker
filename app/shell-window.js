import { ipcRenderer } from 'electron'
import { setup as setupUI } from './shell-window/ui'
import importWebAPIs from './lib/fg/import-web-apis'

importWebAPIs()
setupUI(() => {
  ipcRenderer.send('shell-window-ready')
})

import { ipcRenderer } from 'electron'
import { setup as setupUI } from './shell-window/ui'
import importWebAPIs from './lib/fg/import-web-apis'
import DatArchive from './lib/web-apis/dat-archive'
import beaker from './lib/web-apis/beaker'

importWebAPIs()
window.DatArchive = DatArchive
window.beaker = beaker
setupUI(() => {
  ipcRenderer.send('shell-window-ready')
})

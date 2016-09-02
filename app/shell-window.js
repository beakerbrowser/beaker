import { remote } from 'electron'
import { setup as setupUI } from './shell-window/ui'
import importWebAPIs from './lib/fg/import-web-apis'
const { session } = remote

// setup UI
importWebAPIs()
setupUI()
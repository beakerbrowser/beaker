import { setup as setupUI } from './shell-window/ui'
import history from './lib/fg/history-api'
import * as sitedata from './lib/fg/sitedata-api'

// setup APIs to the background process
sitedata.setup()

// setup UI
setupUI()

// expose some APIs to the window, for debugging with devtools
window.beaker = {
  history,
  sitedata
}
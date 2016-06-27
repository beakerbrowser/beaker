import * as pages from './shell-window/pages'
import { setup as setupUI } from './shell-window/ui'
import { setup as setupCommandHandlers } from './shell-window/command-handlers'
import { setup as setupSwipeHandlers } from './shell-window/swipe-handlers'
import * as history from './lib/fg/history-api'

// run setup
setupUI()
setupCommandHandlers()
setupSwipeHandlers()
pages.create('beaker:start')

// expose some APIs to the window, for debugging with devtools
window.beaker = {
  history
}
import * as pages from './shell-window/pages'
import { setup as setupUI } from './shell-window/ui'
import { setup as setupCommandHandlers } from './shell-window/command-handlers'
import { setup as setupSwipeHandlers } from './shell-window/swipe-handlers'

setupUI()
setupCommandHandlers()
setupSwipeHandlers()
pages.create('http://localhost:1234')
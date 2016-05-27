import * as webviews from './shell-window/webviews'
import { setup as setupUI } from './shell-window/ui'
import { setup as setupCommandHandlers } from './shell-window/command-handlers'
import { setup as setupSwipeHandlers } from './shell-window/swipe-handlers'

setupUI()
setupCommandHandlers()
setupSwipeHandlers()
webviews.create('https://news.ycombinator.com')
import * as webviews from './shell-window/webviews'
import * as ui from './shell-window/ui'
import * as commandHandlers from './shell-window/command-handlers'

ui.setup()
commandHandlers.setup()
webviews.create('https://news.ycombinator.com')
import * as webviews from './shell-window/webviews'
import * as ui from './shell-window/ui'

ui.setup()
webviews.create('https://news.ycombinator.com')
webviews.create('https://github.com')
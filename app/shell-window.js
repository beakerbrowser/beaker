import * as webviews from './shell-window/webviews'
import * as ui from './shell-window/ui'

ui.setup()
webviews.add('https://news.ycombinator.com')
webviews.add('https://github.com')
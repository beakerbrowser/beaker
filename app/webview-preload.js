import { setup as setupCommandHandlers } from './webview-preload/command-handlers'
import { setup as setupContextMenu } from './webview-preload/context-menu'
import { setup as setupStatusBarHover } from './webview-preload/status-bar-hover'
import { setup as setupZoom } from './webview-preload/zoom'
import * as bookmarks from './webview-preload/bookmarks'

// setup standard behaviors
setupCommandHandlers()
setupContextMenu()
setupStatusBarHover()
setupZoom()

// export privileged APIs to builtin pages
// (these APIs should only be made available to sites served over the beaker protocol)
if (window.location.protocol == 'beaker:') {
  window.beaker = {
    bookmarks
  }
}
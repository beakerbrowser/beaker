import { setup as setupCommandHandlers } from './webview-preload/command-handlers'
import { setup as setupContextMenu } from './webview-preload/context-menu'
import { setup as setupStatusBarHover } from './webview-preload/status-bar-hover'

setupCommandHandlers()
setupContextMenu()
setupStatusBarHover()
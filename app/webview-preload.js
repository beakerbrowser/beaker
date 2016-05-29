import { setup as setupCommandHandlers } from './webview-preload/command-handlers'
import { setup as setupContextMenu } from './webview-preload/context-menu'

setupCommandHandlers()
setupContextMenu()
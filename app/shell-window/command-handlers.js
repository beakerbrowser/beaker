import { ipcRenderer } from 'electron'
import * as pages from './pages'
import * as zoom from './pages/zoom'
import * as navbar from './ui/navbar'
import permsPrompt from './ui/prompts/permission'

export function setup () {
  ipcRenderer.on('command', function (event, type, arg1, arg2, arg3) {
    var page = pages.getActive()
    switch (type) {
      case 'file:new-tab':           
        var page = pages.create(arg1)
        pages.setActive(page)
        navbar.focusLocation(page)
        return
      case 'file:open-location':     return navbar.focusLocation(page)
      case 'file:close-tab':         return pages.remove(page)
      case 'file:reopen-closed-tab': return pages.reopenLastRemoved()
      case 'edit:find':              return navbar.showInpageFind(page)
      case 'view:reload':            return page.reload()
      case 'view:hard-reload':       return page.reloadIgnoringCache()
      case 'view:zoom-in':           return zoom.zoomIn(page)
      case 'view:zoom-out':          return zoom.zoomOut(page)
      case 'view:zoom-reset':        return zoom.zoomReset(page)
      case 'view:toggle-dev-tools':  return (page.isDevToolsOpened()) ? page.closeDevTools() : page.openDevTools()
      case 'history:back':           return page.goBack()
      case 'history:forward':        return page.goForward()
      case 'window:next-tab':        return pages.changeActiveBy(1)
      case 'window:prev-tab':        return pages.changeActiveBy(-1)
      case 'set-tab':                return pages.changeActiveTo(arg1)
      case 'load-pinned-tabs':       return pages.loadPinnedFromDB()
      case 'perms:prompt':           return permsPrompt(arg1, arg2, arg3)
    }
  })
}
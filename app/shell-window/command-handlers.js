import { ipcRenderer } from 'electron'
import * as pages from './pages'
import * as zoom from './pages/zoom'
import * as navbar from './ui/navbar'
import * as modal from './ui/modal'
import permsPrompt from './ui/prompts/permission'

export function setup () {
  ipcRenderer.on('command', function (event, type, arg1, arg2, arg3, arg4) {
    var page = pages.getActive()
    switch (type) {
      case 'initialize': return pages.initializeFromSnapshot(arg1)
      case 'file:new-tab':
        page = pages.create(arg1)
        pages.setActive(page)
        navbar.focusLocation(page)
        return
      case 'file:open-location': return navbar.focusLocation(page)
      case 'file:close-tab': return pages.remove(page)
      case 'file:reopen-closed-tab': return pages.reopenLastRemoved()
      case 'edit:find': return navbar.showInpageFind(page)
      case 'edit:find-next': return navbar.findNext(page, true)
      case 'edit:find-previous': return navbar.findNext(page, false)
      case 'view:reload': return page.reload()
      case 'view:hard-reload': return page.reloadIgnoringCacheAsync()
      case 'view:zoom-in': return zoom.zoomIn(page)
      case 'view:zoom-out': return zoom.zoomOut(page)
      case 'view:zoom-reset': return zoom.zoomReset(page)
      case 'view:toggle-dev-tools': return page.toggleDevTools()
      case 'view:toggle-javascript-console': return page.toggleDevTools(true)
      case 'view:toggle-live-reloading': return page.toggleLiveReloading()
      case 'history:back': return page.goBackAsync()
      case 'history:forward': return page.goForwardAsync()
      case 'bookmark:create': return navbar.bookmarkAndOpenMenu()
      case 'window:next-tab': return pages.changeActiveBy(1)
      case 'window:prev-tab': return pages.changeActiveBy(-1)
      case 'window:last-tab': return pages.changeActiveToLast()
      case 'set-tab': return pages.changeActiveTo(arg1)
      case 'load-pinned-tabs': return pages.loadPinnedFromDB()
      case 'perms:prompt': return permsPrompt(arg1, arg2, arg3, arg4)
      case 'show-modal': return modal.createFromBackgroundProcess(arg1, arg2, arg3, arg4)
    }
  })
}

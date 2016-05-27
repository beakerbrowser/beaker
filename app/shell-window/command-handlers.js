import { ipcRenderer } from 'electron'
import * as webviews from './webviews'
import * as navbar from './ui/navbar'

export function setup () {
  ipcRenderer.on('command', function (event, type, arg1) {
    var wv = webviews.getActive()
    switch (type) {
      case 'file:new-tab':           return webviews.setActive(webviews.create(arg1))
      case 'file:open-location':     return navbar.focusLocation()
      case 'file:close-tab':         return webviews.remove(wv)
      case 'file:reopen-closed-tab': return webviews.reopenLastRemoved()
      case 'view:reload':            return wv.reload()
      case 'view:hard-reload':       return wv.reloadIgnoringCache()
      case 'view:toggle-dev-tools':  return (wv.isDevToolsOpened()) ? wv.closeDevTools() : wv.openDevTools()
      case 'history:back':           return wv.goBack()
      case 'history:forward':        return wv.goForward()
      case 'window:next-tab':        return webviews.changeActiveBy(1)
      case 'window:prev-tab':        return webviews.changeActiveBy(-1)
      case 'set-tab':                return webviews.changeActiveTo(arg1)
    }
  })
}
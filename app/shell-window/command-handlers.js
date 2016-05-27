import { ipcRenderer } from 'electron'
import * as webviews from './webviews'
import * as navbar from './ui/navbar'

export function setup () {
  ipcRenderer.on('command', function (event, type) {
    var wv = webviews.getActive()
    switch (type) {
      case 'file:new-tab':          return webviews.setActive(webviews.create())
      case 'file:open-location':    return navbar.focusLocation()
      case 'file:close-tab':        return webviews.remove(wv)
      case 'view:reload':           return wv.reload()
      case 'view:hard-reload':      return wv.reloadIgnoringCache()
      case 'view:toggle-dev-tools': return (wv.isDevToolsOpened()) ? wv.closeDevTools() : wv.openDevTools()
      case 'history:back':          return wv.goBack()
      case 'history:forward':       return wv.goForward()
      case 'window:next-tab':       return webviews.changeActive(1)
      case 'window:prev-tab':       return webviews.changeActive(-1)
    }
  })
}
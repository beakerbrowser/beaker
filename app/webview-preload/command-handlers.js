import { ipcRenderer } from 'electron'
import * as zoom from './zoom'

export function setup () {
  ipcRenderer.on('command', function (event, type, arg1) {
    switch (type) {
      case 'view:zoom-in':    return zoom.zoomIn()
      case 'view:zoom-out':   return zoom.zoomOut()
      case 'view:zoom-reset': return zoom.zoomReset()
    }
  })
}
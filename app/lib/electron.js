import { BrowserWindow, BrowserView } from 'electron'
import * as viewManager from '../background-process/ui/view-manager'

export function findWebContentsParentWindow (wc) {
  var win
  var view = BrowserView.fromWebContents(wc)
  if (view) {
    win = viewManager.findContainingWindow(view)
  } else {
    win = BrowserWindow.fromWebContents(wc)
    while (win.getParentWindow()) {
      win = win.getParentWindow()
    }
  }
  return win
}
import { BrowserWindow, BrowserView } from 'electron'

export function findWebContentsParentWindow (wc) {
  var win
  var view = BrowserView.fromWebContents(wc)
  if (view) {
    outer:
    for (let win2 of BrowserWindow.getAllWindows()) {
      for (let view2 of win2.getBrowserViews()) {
        if (view === view2) {
          win = win2
          break outer
        }
      }
    }
  } else {
    win = BrowserWindow.fromWebContents(wc)
    while (win.getParentWindow()) {
      win = win.getParentWindow()
    }
  }
  return win
}
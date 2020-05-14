import { BrowserWindow, BrowserView } from 'electron'

export function findWebContentsParentWindow (wc) {
  var win
  var view = BrowserView.fromWebContents(wc)
  if (view) {
    // find the window that the view is attached to
    outer:
    for (let win2 of BrowserWindow.getAllWindows()) {
      for (let view2 of win2.getBrowserViews()) {
        if (view === view2) {
          win = win2
          break outer
        }
      }
    }
    // it might not be attached because it was a shell menu that has closed
    // in that case, just go with the focused window
    if (!win) win = BrowserWindow.getFocusedWindow()
  } else {
    win = BrowserWindow.fromWebContents(wc)
    while (win && win.getParentWindow()) {
      win = win.getParentWindow()
    }
  }
  return win
}
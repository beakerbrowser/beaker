import { BrowserWindow } from 'electron'

export function findWebContentsParentWindow (wc) {
  for (let win of BrowserWindow.getAllWindows()) {
    for (let view of win.getBrowserViews()) {
      if (view.webContents === wc) {
        return win
      }
    }
  }
  let win = BrowserWindow.fromWebContents(wc)
  while (win && win.getParentWindow()) {
    win = win.getParentWindow()
  }
  // it might not be attached because it was a shell menu that has closed
  // in that case, just go with the focused window
  if (!win) win = BrowserWindow.getFocusedWindow()
  return win
}
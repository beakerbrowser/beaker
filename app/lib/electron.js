import {BrowserWindow} from 'electron'

export function getWebContentsWindow (wc) {
  while (wc && wc.hostWebContents) {
    wc = wc.hostWebContents
  }
  return BrowserWindow.fromWebContents(wc)
}

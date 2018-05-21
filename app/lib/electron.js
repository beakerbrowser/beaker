import {BrowserWindow} from 'electron'

export function getWebContentsWindow (wc) {
  while (wc && wc.hostWebContents) {
    wc = wc.hostWebContents
  }
  return BrowserWindow.fromWebContents(wc)
}

export function getEnvVar (name) {
  var ucv = process.env[name.toUpperCase()]
  if (typeof ucv !== 'undefined') {
    return ucv
  }
  var lcv = process.env[name.toLowerCase()]
  if (typeof lcv !== 'undefined') {
    return lcv
  }
  return undefined
}
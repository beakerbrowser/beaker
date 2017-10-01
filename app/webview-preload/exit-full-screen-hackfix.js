// HACK
// we dont have an api for getting a webview out of html5 fullscreen mode
// but we cant just executeJavaScript(`document.webkitExitFullscreen()`)
// because an adversarial app could change the function reference to a noop
// so we capture the reference here and expose it via RPC to be sure we
// will have access to it
// -prf

import {ipcRenderer} from 'electron'

const documentCtx = document
const webkitExitFullscreen = document.webkitExitFullscreen

export default function () {
  ipcRenderer.on('exit-full-screen-hackfix', () => {
    webkitExitFullscreen.call(documentCtx)
  })
}

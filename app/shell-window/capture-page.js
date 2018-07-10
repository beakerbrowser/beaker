import path from 'path'
import * as pages from './pages'

const SCROLLBAR_WIDTH = 16
const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 768

// exported API
// =

export async function capturePage (url, {width, height, resizeTo} = {}) {
  var webview
  var hiddenWebviews = document.querySelector('#hidden-webviews')
  try {
    width = width || DEFAULT_WIDTH
    height = height || DEFAULT_HEIGHT

    // create the webview
    webview = document.createElement('webview')
    webview.setAttribute('preload', 'file://' + path.join(pages.APP_PATH, 'webview-preload.build.js'))
    webview.setAttribute('webpreferences', 'allowDisplayingInsecureContent,contentIsolation,defaultEncoding=utf-8')
    webview.setAttribute('partition', 'session-' + Date.now() + Math.random())
    webview.setAttribute('src', url)
    webview.style.width = `${width + SCROLLBAR_WIDTH}px`
    webview.style.height = `${height}px`

    // add to page
    hiddenWebviews.append(webview)

    // wait for load
    await new Promise((resolve, reject) => {
      webview.addEventListener('did-stop-loading', resolve)
    })
    await new Promise(r => setTimeout(r, 200)) // give an extra 200ms for rendering

    // capture the page
    var wc = webview.getWebContents()
    var image = await new Promise((resolve, reject) => {
      wc.capturePage({x: 0, y: 0, width, height}, resolve)
    })

    // resize if asked
    if (resizeTo) {
      image = image.resize(resizeTo)
    }
  } finally {
    if (webview) webview.remove()
  }
  return image.toPNG()
}
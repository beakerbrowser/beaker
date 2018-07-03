import path from 'path'
import * as pages from './pages'

// exported API
// =

export async function getScreenshot (url, {width, height}, {resizeTo} = {}) {
  var webview
  var hiddenWebviews = document.querySelector('#hidden-webviews')
  try {
    // create the webview
    webview = document.createElement('webview')
    webview.setAttribute('preload', 'file://' + path.join(pages.APP_PATH, 'webview-preload.build.js'))
    webview.setAttribute('webpreferences', 'allowDisplayingInsecureContent,contentIsolation,defaultEncoding=utf-8')
    webview.setAttribute('src', url)
    webview.style.width = `${width}px`
    webview.style.height = `${height}px`

    // add to page
    hiddenWebviews.append(webview)

    // wait for load
    await new Promise((resolve, reject) => {
      webview.addEventListener('did-stop-loading', resolve)
    })
    await new Promise(r => setTimeout(r, 100)) // give an extra 100ms for the JS rendering

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
  return image
}
/**
 * Status Bar
 *
 * NOTES
 * - There can only ever be one Status Bar window for a given browser window
 * - Status Bar views are created with each browser window and then shown/hidden as needed
 */
import { BrowserView } from 'electron'

const WIDTH = 400
const HEIGHT = 24

// globals
// =

var views = {} // map of {[parentWindow.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
  var view = views[parentWindow.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8'
    }
  })
  view.webContents.loadFile('status-bar.html')
  view.webContents.executeJavaScript(`set(false)`)
  show(parentWindow)
}

export function destroy (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).destroy()
    delete views[parentWindow.id]
  }
}

export function get (parentWindow) {
  return views[parentWindow.id]
}

export function reposition (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    var {height} = parentWindow.getContentBounds()
    view.setBounds({x: 0, y: height - HEIGHT, width: WIDTH, height: HEIGHT})
  }
}

export function show (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    parentWindow.addBrowserView(view)
    reposition(parentWindow)
  }
}

export function hide (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    parentWindow.removeBrowserView(view)
  }
}

export function set (parentWindow, value) {
  var view = get(parentWindow)
  if (view) {
    if (value) show(parentWindow)
    view.webContents.executeJavaScript(`set(${JSON.stringify(value)})`)
    if (!value) hide(parentWindow)
  }
}
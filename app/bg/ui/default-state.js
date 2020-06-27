export function defaultBrowsingSessionState () {
  return {
    windows: [ defaultWindowState() ],
    cleanExit: true
  }
}

export function defaultWindowState () {
  // HACK
  // for some reason, electron.screen comes back null sometimes
  // not sure why, shouldn't be happening
  // check for existence for now, see #690
  // -prf
  const screen = require('electron').screen
  var bounds = screen ? screen.getPrimaryDisplay().bounds : {width: 800, height: 600}
  var width = Math.max(800, Math.min(1800, bounds.width - 50))
  var height = Math.max(600, Math.min(1200, bounds.height - 50))
  var minWidth = 400
  var minHeight = 300
  return {
    x: (bounds.width - width) / 2,
    y: (bounds.height - height) / 2,
    width,
    height,
    minWidth,
    minHeight,
    pages: defaultPageState(),
    isAlwaysOnTop: false,
    isShellInterfaceHidden: false
  }
}

export function defaultPageState () {
  return []
}

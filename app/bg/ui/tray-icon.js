import { app, Tray, Menu, BrowserWindow } from 'electron'
import path from 'path'
import { createShellWindow } from './windows'
import * as tabManager from './tab-manager'
import * as settingsDb from '../dbs/settings'

const IS_WIN = process.platform === 'win32'
const IS_LINUX = process.platform === 'linux'
const ICON = IS_LINUX || IS_WIN ? 'assets/img/tray-icon-white.png' : 'assets/img/tray-icon.png'

// globals
// =

var tray

// exported api
// =

export function setup () {
  tray = new Tray(path.join(__dirname, ICON))
  tray.setToolTip('Beaker daemon')
  settingsDb.on('set:run_background', buildMenu)
  buildMenu()
}

// internal
// =

async function buildMenu () {
  var runBackground = !!(await settingsDb.get('run_background'))
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Open new tab', click: onClickOpen},
    {type: 'separator'},
    {type: 'checkbox', label: 'Let Beaker run in the background', checked: runBackground, click: () => onTogglePersist(!runBackground)},
    {label: 'Quit Beaker', click: () => app.quit()}
  ])
  tray.setContextMenu(contextMenu)
}

function onClickOpen () {
  var win = BrowserWindow.getAllWindows()[0]
  if (win) {
    win.show()
    tabManager.create(win, undefined, {setActive: true})
  } else {
    createShellWindow()
  }
}

function onTogglePersist (v) {
  settingsDb.set('run_background', v ? 1 : 0)
}
import { app, Tray, Menu, BrowserWindow, nativeTheme } from 'electron'
import path from 'path'
import { createShellWindow, restoreLastShellWindow } from './windows'
import * as tabManager from './tabs/manager'
import * as settingsDb from '../dbs/settings'

const IS_MAC = process.platform === 'darwin'

// globals
// =

var tray

// exported api
// =

export function setup () {
  tray = new Tray(path.join(__dirname, getIcon()))
  tray.setToolTip('Beaker Browser')
  tray.on('click', e => tray.popupContextMenu())
  settingsDb.on('set:run_background', buildMenu)
  nativeTheme.on('updated', updateIcon)
  buildMenu()
}

// internal
// =

function getIcon () {
  if (IS_MAC) {
    return nativeTheme.shouldUseDarkColors ? 'assets/img/tray-icon-white.png' : 'assets/img/tray-icon-black.png'
  }
  return 'assets/img/tray-icon-white@2x.png'
}

function updateIcon () {
  tray.setImage(path.join(__dirname, getIcon()))
}

async function buildMenu () {
  var runBackground = !!(await settingsDb.get('run_background'))
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Open new tab', click: onClickOpen},
    {label: 'Restore last window', click: onClickRestore},
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

function onClickRestore () {
  restoreLastShellWindow()
}

function onTogglePersist (v) {
  settingsDb.set('run_background', v ? 1 : 0)
}
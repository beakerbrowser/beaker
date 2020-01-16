import { app, BrowserWindow, dialog, Menu } from 'electron'
import { createShellWindow, toggleShellInterface, getFocusedDevToolsHost } from './windows'
import * as tabManager from './tab-manager'
import * as viewZoom from './tabs/zoom'
import {download} from './downloads'
import dat from '../dat/index'

// exported APIs
// =

export function setup () {
  setApplicationMenu({ noWindows: true })

  // watch for changes to the currently active window
  app.on('browser-window-focus', async (e, win) => {
    try {
      // fetch the current url
      const url = tabManager.getActive(win).url

      // rebuild as needed
      if (requiresRebuild(url)) {
        setApplicationMenu({url})
      }
    } catch (e) {
      // `pages` not set yet
    }
  })

  // watch for all windows to be closed
  app.on('custom-window-all-closed', () => {
    setApplicationMenu({ noWindows: true })
  })

  // watch for any window to be opened
  app.on('browser-window-created', () => {
    setApplicationMenu()
  })
}

export function onSetCurrentLocation (win, url) {
  // check if this is the currently focused window
  if (!url || win !== BrowserWindow.getFocusedWindow()) {
    return
  }

  // rebuild as needed
  if (requiresRebuild(url)) {
    setApplicationMenu({url})
  }
}

export function setApplicationMenu (opts = {}) {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildWindowMenu(opts)))
}

export function buildWindowMenu (opts = {}) {
  const isDriveSite = opts.url && opts.url.startsWith('web://')
  const noWindows = opts.noWindows === true
  const getWin = () => BrowserWindow.getFocusedWindow()

  var darwinMenu = {
    label: 'Beaker',
    submenu: [
      {
        label: 'Preferences',
        accelerator: 'Command+,',
        click (item) {
          var win = getWin()
          if (win) tabManager.create(win, 'beaker://settings', {setActive: true})
          else createShellWindow({ pages: ['beaker://settings'] })
        }
      },
      { type: 'separator' },
      { label: 'Services', role: 'services', submenu: [] },
      { type: 'separator' },
      { label: 'Hide Beaker', accelerator: 'Command+H', role: 'hide' },
      { label: 'Hide Others', accelerator: 'Command+Alt+H', role: 'hideothers' },
      { label: 'Show All', role: 'unhide' },
      { type: 'separator' },
      { label: 'Quit', accelerator: 'Command+Q', click () { app.quit() }, reserved: true }
    ]
  }

  var fileMenu = {
    label: 'File',
    submenu: [
      {
        label: 'New Tab',
        accelerator: 'CmdOrCtrl+T',
        click: function (item) {
          var win = getWin()
          if (win) {
            tabManager.create(win, undefined, {setActive: true, focusLocationBar: true})
          } else {
            createShellWindow()
          }
        },
        reserved: true
      },
      {
        label: 'New Window',
        accelerator: 'CmdOrCtrl+N',
        click: function () { createShellWindow() },
        reserved: true
      },
      {
        label: 'Reopen Closed Tab',
        accelerator: 'CmdOrCtrl+Shift+T',
        click: function (item) {
          var win = getWin()
          createWindowIfNone(win, (win) => {
            tabManager.reopenLastRemoved(win)
          })
        },
        reserved: true
      },
      {
        label: 'Open File',
        accelerator: 'CmdOrCtrl+O',
        click: function (item) {
          var win = getWin()
          createWindowIfNone(win, (win) => {
            dialog.showOpenDialog({ title: 'Open file...', properties: ['openFile', 'createDirectory'] }, files => {
              if (files && files[0]) { tabManager.create(win, 'file://' + files[0], {setActive: true}) }
            })
          })
        }
      },
      {
        label: 'Open Location',
        accelerator: 'CmdOrCtrl+L',
        click: function (item) {
          var win = getWin()
          createWindowIfNone(win, (win) => {
            win.webContents.send('command', 'focus-location')
          })
        }
      },
      { type: 'separator' },
      {
        label: 'Save Page As...',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+S',
        click: async (item) => {
          var win = getWin()
          var tab = tabManager.getActive(win)
          if (!tab) return
          const url = tab.url
          const title = tab.title
          dialog.showSaveDialog({ title: `Save ${title} as...`, defaultPath: app.getPath('downloads') }, filepath => {
            if (filepath) download(win, win.webContents, url, { saveAs: filepath, suppressNewDownloadEvent: true })
          })
        }
      },
      {
        label: 'Print...',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+P',
        click: (item) => {
          var tab = tabManager.getActive(getWin())
          if (!tab) return
          tab.webContents.print()
        }
      },
      { type: 'separator' },
      {
        label: 'Close Window',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Shift+W',
        click: function (item) {
          var win = getWin()
          if (win) win.close()
        },
        reserved: true
      },
      {
        label: 'Close Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+W',
        click: function (item) {
          var win = getWin()
          if (win) {
            // a regular browser window
            let active = tabManager.getActive(win)
            if (active) {
              if (active.isSidebarActive) {
                active.executeSidebarCommand('hide-panel', 'focused')
              } else {
                tabManager.remove(win, active)
              }
            }
          } else {
            // devtools
            let wc = getFocusedDevToolsHost()
            if (wc) {
              wc.closeDevTools()
            }
          }
        },
        reserved: true
      }
    ]
  }

  var editMenu = {
    label: 'Edit',
    submenu: [
      { label: 'Undo', enabled: !noWindows, accelerator: 'CmdOrCtrl+Z', selector: 'undo:', reserved: true },
      { label: 'Redo', enabled: !noWindows, accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:', reserved: true },
      { type: 'separator' },
      { label: 'Cut', enabled: !noWindows, accelerator: 'CmdOrCtrl+X', selector: 'cut:', reserved: true },
      { label: 'Copy', enabled: !noWindows, accelerator: 'CmdOrCtrl+C', selector: 'copy:', reserved: true },
      { label: 'Paste', enabled: !noWindows, accelerator: 'CmdOrCtrl+V', selector: 'paste:', reserved: true },
      { label: 'Select All', enabled: !noWindows, accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
      {
        label: 'Find in Page',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+F',
        click: function (item) {
          var tab = tabManager.getActive(getWin())
          if (tab) tab.showInpageFind()
        }
      },
      {
        label: 'Find Next',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+G',
        click: function (item) {
          var tab = tabManager.getActive(getWin())
          if (tab) tab.moveInpageFind(1)
        }
      },
      {
        label: 'Find Previous',
        enabled: !noWindows,
        accelerator: 'Shift+CmdOrCtrl+G',
        click: function (item) {
          var tab = tabManager.getActive(getWin())
          if (tab) tab.moveInpageFind(-1)
        }
      }
    ]
  }

  var viewMenu = {
    label: 'View',
    submenu: [{
      label: 'Reload',
      enabled: !noWindows,
      accelerator: 'CmdOrCtrl+R',
      click: function (item) {
        var win = getWin()
        if (win) {
          let active = tabManager.getActive(win)
          if (active) {
            active.webContents.reload()
          }
        }
      },
      reserved: true
    },
      {
        label: 'Hard Reload (Clear Cache)',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: function (item) {
          // HACK
          // this is *super* lazy but it works
          // clear all dat-dns cache on hard reload, to make sure the next
          // load is fresh
          // -prf
          dat.dns.flushCache()

          var win = getWin()
          if (win) {
            let active = tabManager.getActive(win)
            if (active) {
              active.webContents.reloadIgnoringCache()
            }
          }
        },
        reserved: true
      },
      { type: 'separator' },
      {
        type: 'submenu',
        label: 'Sidebar',
        submenu: [
          {
            label: 'Open Editor',
            enabled: !noWindows,
            accelerator: 'CmdOrCtrl+b',
            click: async function (item) {
              var win = getWin()
              if (win) {
                let active = tabManager.getActive(win)
                if (active) active.executeSidebarCommand('show-panel', 'editor-app')
              }
            }
          },
          {
            label: 'Open Terminal',
            enabled: !noWindows,
            accelerator: 'Ctrl+`',
            click: function (item) {
              var win = getWin()
              if (win) {
                let active = tabManager.getActive(win)
                if (active) active.executeSidebarCommand('show-panel', 'web-term')
              }
            }
          },
        ]
      },
      {
        label: 'Toggle Browser UI',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Shift+H',
        click: function (item) {
          var win = getWin()
          if (!win) return
          toggleShellInterface(win)
        }
      },
      {
        label: 'Pop Out Tab',
        enabled: !noWindows,
        accelerator: 'Shift+CmdOrCtrl+P',
        click: function (item) {
          var win = getWin()
          if (!win) return
          var active = tabManager.getActive(win)
          if (!active) return
          tabManager.popOutTab(active)
        }
      },
      {
        label: 'Full Screen',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Ctrl+Cmd+F' : 'F11',
        role: 'toggleFullScreen'
      },
    { type: 'separator' },
      {
        label: 'Zoom In',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Plus',
        reserved: true,
        click: function (item) {
          var win = getWin()
          if (win) {
            viewZoom.zoomIn(tabManager.getActive(win))
          }
        }
      },
      {
        label: 'Zoom Out',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+-',
        reserved: true,
        click: function (item) {
          var win = getWin()
          if (win) {
            viewZoom.zoomOut(tabManager.getActive(win))
          }
        }
      },
      {
        label: 'Actual Size',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+0',
        click: function (item) {
          var win = getWin()
          if (win) {
            viewZoom.zoomReset(tabManager.getActive(win))
          }
        }
      }
    ]
  }

  var showHistoryAccelerator = 'Ctrl+h'

  if (process.platform === 'darwin') {
    showHistoryAccelerator = 'Cmd+y'
  }

  var historyMenu = {
    label: 'History',
    role: 'history',
    submenu: [
      {
        label: 'Back',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Left',
        click: function (item) {
          var win = getWin()
          if (win) {
            let active = tabManager.getActive(win)
            if (active) active.webContents.goBack()
          }
        }
      },
      {
        label: 'Forward',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Right',
        click: function (item) {
          var win = getWin()
          if (win) {
            let active = tabManager.getActive(win)
            if (active) active.webContents.goForward()
          }
        }
      },
      {
        label: 'Show Full History',
        accelerator: showHistoryAccelerator,
        click: function (item) {
          var win = getWin()
          if (win) tabManager.create(win, 'beaker://history', {setActive: true})
          else createShellWindow({ pages: ['beaker://history'] })
        }
      },
      { type: 'separator' },
      {
        label: 'Bookmark this Page',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+D',
        click: function (item) {
          var win = getWin()
          if (win) win.webContents.send('command', 'create-bookmark')
        }
      }
    ]
  }

  var developerMenu = {
    label: 'Developer',
    submenu: [
      {
        type: 'submenu',
        label: 'Advanced Tools',
        submenu: [{
          label: 'Reload Shell-Window',
          enabled: !noWindows,
          click: function () {
            getWin().webContents.reloadIgnoringCache()
          }
        }, {
          label: 'Toggle Shell-Window DevTools',
          enabled: !noWindows,
          click: function () {
            getWin().webContents.openDevTools({mode: 'detach'})
          }
        },
      { type: 'separator' },
          {
            label: 'Open Archives Debug Page',
            enabled: !noWindows,
            click: function (item) {
              var win = getWin()
              if (win) tabManager.create(win, 'beaker://internal-archives/', {setActive: true})
            }
          }, {
            label: 'Open Dat-DNS Cache Page',
            enabled: !noWindows,
            click: function (item) {
              var win = getWin()
              if (win) tabManager.create(win, 'beaker://dat-dns-cache/', {setActive: true})
            }
          }, {
            label: 'Open Debug Log Page',
            enabled: !noWindows,
            click: function (item) {
              var win = getWin()
              if (win) tabManager.create(win, 'beaker://debug-log/', {setActive: true})
            }
          }]
      },
      {
        label: 'Toggle DevTools',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+I' : 'Shift+CmdOrCtrl+I',
        click: function (item) {
          var win = getWin()
          if (win) {
            let active = tabManager.getActive(win)
            if (active) active.webContents.toggleDevTools()
          }
        },
        reserved: true
      },
      {
        label: 'Toggle Live Reloading',
        enabled: !!isDriveSite,
        click: function (item) {
          var win = getWin()
          if (win) {
            let active = tabManager.getActive(win)
            if (active) active.toggleLiveReloading()
          }
        }
      }
    ]
  }

  var windowMenu = {
    label: 'Window',
    role: 'window',
    submenu: [
      {
        type: 'checkbox',
        label: 'Always on Top',
        checked: (getWin() ? getWin().isAlwaysOnTop() : false),
        click: function () {
          var win = getWin()
          if (!win) return
          win.setAlwaysOnTop(!win.isAlwaysOnTop())
        }
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Next Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+}',
        click: function (item) {
          var win = getWin()
          if (win) tabManager.changeActiveBy(win, 1)
        }
      },
      {
        label: 'Previous Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+{',
        click: function (item) {
          var win = getWin()
          if (win) tabManager.changeActiveBy(win, -1)
        }
      }
    ]
  }
  if (process.platform == 'darwin') {
    windowMenu.submenu.push({
      type: 'separator'
    })
    windowMenu.submenu.push({
      label: 'Bring All to Front',
      role: 'front'
    })
  }

  var helpMenu = {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: 'Help',
        accelerator: 'F1',
        click: function (item) {
          var win = getWin()
          if (win) tabManager.create(win, 'https://beakerbrowser.com/docs/', {setActive: true})
        }
      },
      {
        label: 'Report Bug',
        click: function (item) {
          var win = getWin()
          if (win) tabManager.create(win, 'https://github.com/beakerbrowser/beaker/issues', {setActive: true})
        }
      },
      {
        label: 'Mailing List',
        click: function (item) {
          var win = getWin()
          if (win) tabManager.create(win, 'https://groups.google.com/forum/#!forum/beaker-browser', {setActive: true})
        }
      }
    ]
  }
  if (process.platform !== 'darwin') {
    helpMenu.submenu.push({ type: 'separator' })
    helpMenu.submenu.push({
      label: 'About',
      role: 'about',
      click: function (item) {
        var win = getWin()
        if (win) tabManager.create(win, 'beaker://settings', {setActive: true})
      }
    })
  }

  // assemble final menu
  var menus = [fileMenu, editMenu, viewMenu, historyMenu, developerMenu, windowMenu, helpMenu]
  if (process.platform === 'darwin') menus.unshift(darwinMenu)
  return menus
}

// internal helpers
// =

var lastURLProtocol = false
function requiresRebuild (url) {
  const urlProtocol = url ? url.split(':')[0] : false
  // check if this is a change of protocol
  const b = (lastURLProtocol !== urlProtocol)
  lastURLProtocol = urlProtocol
  return b
}

function createWindowIfNone (win, onShow) {
  if (win) return onShow(win)
  win = createShellWindow()
  win.once('show', onShow.bind(null, win))
}

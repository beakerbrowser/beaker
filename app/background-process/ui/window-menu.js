import * as beakerCore from '@beaker/core'
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { createShellWindow, getFocusedDevToolsHost } from './windows'
import {download} from './downloads'

// exported APIs
// =

export function setup () {
  setApplicationMenu({ noWindows: true })

  // watch for changes to the window's
  ipcMain.on('shell-window:set-current-location', (e, url) => {
    // check if this is the currently focused window
    const fwin = BrowserWindow.getFocusedWindow()
    if (!url || !fwin || e.sender !== fwin.webContents) {
      return
    }

    // rebuild as needed
    if (requiresRebuild(url)) {
      setApplicationMenu({url})
    }
  })

  // watch for changes to the currently active window
  app.on('browser-window-focus', async (e, win) => {
    try {
      // fetch the current url
      const url = await win.webContents.executeJavaScript(`pages.getActive().getIntendedURL()`)

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

export function setApplicationMenu (opts = {}) {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildWindowMenu(opts)))
}

export function buildWindowMenu (opts = {}) {
  const isDat = opts.url && opts.url.startsWith('dat://')
  const noWindows = opts.noWindows === true

  var darwinMenu = {
    label: 'Beaker',
    submenu: [
      {
        label: 'Preferences',
        accelerator: 'Command+,',
        click (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'beaker://settings')
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
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab')
          else createShellWindow()
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
        click: function (item, win) {
          createWindowIfNone(win, (win) => {
            win.webContents.send('command', 'file:reopen-closed-tab')
          })
        },
        reserved: true
      },
      {
        label: 'Open File',
        accelerator: 'CmdOrCtrl+O',
        click: function (item, win) {
          createWindowIfNone(win, (win) => {
            dialog.showOpenDialog({ title: 'Open file...', properties: ['openFile', 'createDirectory'] }, files => {
              if (files && files[0]) { win.webContents.send('command', 'file:new-tab', 'file://' + files[0]) }
            })
          })
        }
      },
      {
        label: 'Open Location',
        accelerator: 'CmdOrCtrl+L',
        click: function (item, win) {
          createWindowIfNone(win, (win) => {
            win.webContents.send('command', 'file:open-location')
          })
        }
      },
      { type: 'separator' },
      {
        label: 'Save Page As...',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+S',
        click: async (item, win) => {
          const url = await win.webContents.executeJavaScript(`pages.getActive().getIntendedURL()`)
          const title = await win.webContents.executeJavaScript(`pages.getActive().title`)
          dialog.showSaveDialog({ title: `Save ${title} as...`, defaultPath: app.getPath('downloads') }, filepath => {
            if (filepath) download(win, win.webContents, url, { saveAs: filepath, suppressNewDownloadEvent: true })
          })
        }
      },
      {
        label: 'Print...',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+P',
        click: (item, win) => {
          win.webContents.executeJavaScript(`pages.getActive().webviewEl.getWebContents().print()`)
        }
      },
      { type: 'separator' },
      {
        label: 'Close Window',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Shift+W',
        click: function (item, win) {
          if (win) win.close()
        },
        reserved: true
      },
      {
        label: 'Close Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+W',
        click: function (item, win) {
          if (win) {
            // a regular browser window
            win.webContents.send('command', 'file:close-tab')
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
        click: function (item, win) {
          if (win) win.webContents.send('command', 'edit:find')
        }
      },
      {
        label: 'Find Next',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+G',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'edit:find-next')
        }
      },
      {
        label: 'Find Previous',
        enabled: !noWindows,
        accelerator: 'Shift+CmdOrCtrl+G',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'edit:find-previous')
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
      click: function (item, win) {
        if (win) win.webContents.send('command', 'view:reload')
      },
      reserved: true
    },
      {
        label: 'Hard Reload (Clear Cache)',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: function (item, win) {
          // HACK
          // this is *super* lazy but it works
          // clear all dat-dns cache on hard reload, to make sure the next
          // load is fresh
          // -prf
          beakerCore.dat.dns.flushCache()

          if (win) win.webContents.send('command', 'view:hard-reload')
        },
        reserved: true
      },
    { type: 'separator' },
      {
        label: 'Zoom In',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Plus',
        reserved: true,
        click: function (item, win) {
          if (win) win.webContents.send('command', 'view:zoom-in')
        }
      },
      {
        label: 'Zoom Out',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+-',
        reserved: true,
        click: function (item, win) {
          if (win) win.webContents.send('command', 'view:zoom-out')
        }
      },
      {
        label: 'Actual Size',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+0',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'view:zoom-reset')
        }
      },
    { type: 'separator' },
      {
        type: 'submenu',
        label: 'Advanced Tools',
        submenu: [{
          label: 'Reload Shell-Window',
          enabled: !noWindows,
          accelerator: 'CmdOrCtrl+alt+shift+R',
          click: function () {
            BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache()
          }
        }, {
          label: 'Toggle Shell-Window DevTools',
          enabled: !noWindows,
          accelerator: 'CmdOrCtrl+alt+shift+I',
          click: function () {
            BrowserWindow.getFocusedWindow().toggleDevTools()
          }
        },
      { type: 'separator' },
          {
            label: 'Open Archives Debug Page',
            enabled: !noWindows,
            click: function (item, win) {
              if (win) win.webContents.send('command', 'file:new-tab', 'beaker://internal-archives/')
            }
          }, {
            label: 'Open Dat-DNS Cache Page',
            enabled: !noWindows,
            click: function (item, win) {
              if (win) win.webContents.send('command', 'file:new-tab', 'beaker://dat-dns-cache/')
            }
          }, {
            label: 'Open Debug Log Page',
            enabled: !noWindows,
            click: function (item, win) {
              if (win) win.webContents.send('command', 'file:new-tab', 'beaker://debug-log/')
            }
          }]
      },
      {
        label: 'Toggle DevTools',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+I' : 'Shift+CmdOrCtrl+I',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'view:toggle-dev-tools')
        },
        reserved: true
      },
      {
        label: 'Toggle Javascript Console',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+J' : 'Shift+CmdOrCtrl+J',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'view:toggle-javascript-console')
        },
        reserved: true
      },
      {
        label: 'Toggle Live Reloading',
        enabled: !!isDat,
        click: function (item, win) {
          if (win) win.webContents.send('command', 'view:toggle-live-reloading')
        }
      }]
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
        click: function (item, win) {
          if (win) win.webContents.send('command', 'history:back')
        }
      },
      {
        label: 'Forward',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Right',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'history:forward')
        }
      },
      {
        label: 'Show Full History',
        accelerator: showHistoryAccelerator,
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'beaker://history')
          else createShellWindow({ pages: ['beaker://history'] })
        }
      },
      { type: 'separator' },
      {
        label: 'Bookmark this Page',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+D',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'bookmark:create')
        }
      }
    ]
  }

  var windowMenu = {
    label: 'Window',
    role: 'window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Next Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+}',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'window:next-tab')
        }
      },
      {
        label: 'Previous Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+{',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'window:prev-tab')
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
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'https://beakerbrowser.com/docs/')
        }
      },
      {
        label: 'Report Bug',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'https://github.com/beakerbrowser/beaker/issues')
        }
      },
      {
        label: 'Mailing List',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'https://groups.google.com/forum/#!forum/beaker-browser')
        }
      }
    ]
  }
  if (process.platform !== 'darwin') {
    helpMenu.submenu.push({ type: 'separator' })
    helpMenu.submenu.push({
      label: 'About',
      role: 'about',
      click: function (item, win) {
        if (win) win.webContents.send('command', 'file:new-tab', 'beaker://settings')
      }
    })
  }

  // assemble final menu
  var menus = [fileMenu, editMenu, viewMenu, historyMenu, windowMenu, helpMenu]
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

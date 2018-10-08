import * as beakerCore from '@beaker/core'
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { createShellWindow, getFocusedDevToolsHost } from './windows'
import path from 'path'
import { download } from './downloads'

// exported APIs
// =

export function setup() {
  setApplicationMenu()

  // watch for changes to the window's
  ipcMain.on('shell-window:set-current-location', (e, url) => {
    // check if this is the currently focused window
    const fwin = BrowserWindow.getFocusedWindow()
    if (!url || !fwin || e.sender !== fwin.webContents) {
      return
    }

    // rebuild as needed
    if (requiresRebuild(url)) {
      setApplicationMenu({ url })
    }
  })

  // watch for changes to the currently active window
  app.on('browser-window-focus', async (e, win) => {
    try {
      // fetch the current url
      const url = await win.webContents.executeJavaScript(`pages.getActive().getIntendedURL()`)

      // rebuild as needed
      if (requiresRebuild(url)) {
        setApplicationMenu({ url })
      }
    } catch (e) {
      // `pages` not set yet
    }
  })
}

export function setApplicationMenu(opts = {}) {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildWindowMenu(opts)))
}

export function buildWindowMenu(opts = {}) {
  const isDat = opts.url && opts.url.startsWith('dat://')

  var darwinMenu = {
    label: 'Beaker',
    submenu: [
      {
        label: 'Preferences',
        accelerator: 'Command+,',
        click(item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'beaker://settings')
        }
      },
      { type: 'separator' },
      { label: 'Services', role: 'services', submenu: [] },
      { type: 'separator' },
      { label: 'Hide Beaker', accelerator: 'Command+H', role: 'hide' },
      { label: 'Hide Others', accelerator: 'Command+Alt+H', role: 'hideothers' },
      { label: 'Show All', role: 'unhide' },
      { type: 'separator' },
      { label: 'Quit', accelerator: 'Command+Q', click() { app.quit() }, reserved: true }
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
          if (win) win.webContents.send('command', 'file:reopen-closed-tab')
        },
        reserved: true
      },
      {
        label: 'Open File',
        accelerator: 'CmdOrCtrl+O',
        click: function (item, win) {
          if (win) {
            dialog.showOpenDialog({ title: 'Open file...', properties: ['openFile', 'createDirectory'] }, files => {
              if (files && files[0]) { win.webContents.send('command', 'file:new-tab', 'file://' + files[0]) }
            })
          }
        }
      },
      {
        label: 'Open Location',
        accelerator: 'CmdOrCtrl+L',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:open-location')
        }
      },
      { type: 'separator' },
      {
        label: 'Save Page As...',
        accelerator: 'CmdOrCtrl+S',
        click: async (item, win) => {
          const url = await win.webContents.executeJavaScript(`pages.getActive().getIntendedURL()`)
          const title = await win.webContents.executeJavaScript(`pages.getActive().title`)
          const defaultPath = path.join(app.getPath('downloads'), path.basename(title))
          dialog.showSaveDialog({ title: `Save ${title} as...`, defaultPath: defaultPath }, filepath => {
            if (filepath) download(win, win.webContents, url, { saveAs: filepath })
          })
        }
      },
      {
        label: 'Print...',
        accelerator: 'CmdOrCtrl+P',
        click: (item, win) => {
          win.webContents.executeJavaScript(`pages.getActive().webviewEl.getWebContents().print()`)
        }
      },
      { type: 'separator' },
      {
        label: 'Close Window',
        accelerator: 'CmdOrCtrl+Shift+W',
        click: function (item, win) {
          if (win) win.close()
        },
        reserved: true
      },
      {
        label: 'Close Tab',
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
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:', reserved: true },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:', reserved: true },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:', reserved: true },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:', reserved: true },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:', reserved: true },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
      {
        label: 'Find in Page',
        accelerator: 'CmdOrCtrl+F',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'edit:find')
        }
      },
      {
        label: 'Find Next',
        accelerator: 'CmdOrCtrl+G',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'edit:find-next')
        }
      },
      {
        label: 'Find Previous',
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
      accelerator: 'CmdOrCtrl+Plus',
      reserved: true,
      click: function (item, win) {
        if (win) win.webContents.send('command', 'view:zoom-in')
      }
    },
    {
      label: 'Zoom Out',
      accelerator: 'CmdOrCtrl+-',
      reserved: true,
      click: function (item, win) {
        if (win) win.webContents.send('command', 'view:zoom-out')
      }
    },
    {
      label: 'Actual Size',
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
        accelerator: 'CmdOrCtrl+alt+shift+R',
        click: function () {
          BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache()
        }
      }, {
        label: 'Toggle Shell-Window DevTools',
        accelerator: 'CmdOrCtrl+alt+shift+I',
        click: function () {
          BrowserWindow.getFocusedWindow().toggleDevTools()
        }
      },
      { type: 'separator' },
      {
        label: 'Open Archives Debug Page',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'beaker://internal-archives/')
        }
      }, {
        label: 'Open Dat-DNS Cache Page',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'beaker://dat-dns-cache/')
        }
      }, {
        label: 'Open Debug Log Page',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'file:new-tab', 'beaker://debug-log/')
        }
      }]
    },
    {
      label: 'Toggle DevTools',
      accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+I' : 'Shift+CmdOrCtrl+I',
      click: function (item, win) {
        if (win) win.webContents.send('command', 'view:toggle-dev-tools')
      },
      reserved: true
    },
    {
      label: 'Toggle Javascript Console',
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
        accelerator: 'CmdOrCtrl+Left',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'history:back')
        }
      },
      {
        label: 'Forward',
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
        }
      },
      { type: 'separator' },
      {
        label: 'Bookmark this Page',
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
        accelerator: 'CmdOrCtrl+}',
        click: function (item, win) {
          if (win) win.webContents.send('command', 'window:next-tab')
        }
      },
      {
        label: 'Previous Tab',
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
function requiresRebuild(url) {
  const urlProtocol = url ? url.split(':')[0] : false
  // check if this is a change of protocol
  const b = (lastURLProtocol !== urlProtocol)
  lastURLProtocol = urlProtocol
  return b
}

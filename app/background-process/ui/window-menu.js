import { app, BrowserWindow, dialog } from 'electron'
import { createShellWindow } from './windows'
import datDns from '../networks/dat/dns'

var darwinMenu = {
  label: 'Beaker',
  submenu: [
    {
      label: 'Preferences',
      click (item, win) {
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
    { label: 'Quit', accelerator: 'Command+Q', click () { app.quit() } }
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
      }
    },
    {
      label: 'New Window',
      accelerator: 'CmdOrCtrl+N',
      click: function () { createShellWindow() }
    },
    {
      label: 'Reopen Closed Tab',
      accelerator: 'CmdOrCtrl+Shift+T',
      click: function (item, win) {
        if (win) win.webContents.send('command', 'file:reopen-closed-tab')
      }
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
      label: 'Close Window',
      accelerator: 'CmdOrCtrl+Shift+W',
      click: function (item, win) {
        if (win) win.close()
      }
    },
    {
      label: 'Close Tab',
      accelerator: 'CmdOrCtrl+W',
      click: function (item, win) {
        if (win) win.webContents.send('command', 'file:close-tab')
      }
    }
  ]
}

var editMenu = {
  label: 'Edit',
  submenu: [
    { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
    { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
    { type: 'separator' },
    { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
    { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
    { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
    { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
    {
      label: 'Find in Page',
      accelerator: 'CmdOrCtrl+F',
      click: function (item, win) {
        if (win) win.webContents.send('command', 'edit:find')
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
    }
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
      datDns.flushCache()

      if (win) win.webContents.send('command', 'view:hard-reload')
    }
  },
  { type: 'separator' },
  {
    label: 'Zoom In',
    accelerator: 'CmdOrCtrl+Plus',
    click: function (item, win) {
      if (win) win.webContents.send('command', 'view:zoom-in')
    }
  },
  {
    label: 'Zoom Out',
    accelerator: 'CmdOrCtrl+-',
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
    label: 'Toggle DevTools',
    accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+I' : 'Shift+CmdOrCtrl+I',
    click: function (item, win) {
      if (win) win.webContents.send('command', 'view:toggle-dev-tools')
    }
  },
  {
    label: 'Toggle Sidebar',
    accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+B' : 'Shift+CmdOrCtrl+B',
    click: function (item, win) {
      if (win) win.webContents.send('command', 'view:toggle-sidebar')
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
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
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

var beakerDevMenu = {
  label: 'BeakerDev',
  submenu: [{
    label: 'Reload Shell-Window',
    click: function () {
      BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache()
    }
  }, {
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
    label: 'Toggle Shell-Window DevTools',
    click: function () {
      BrowserWindow.getFocusedWindow().toggleDevTools()
    }
  }]
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

export default function buildWindowMenu () {
  var menus = [fileMenu, editMenu, viewMenu, historyMenu, windowMenu, helpMenu]
  if (process.platform === 'darwin') menus.unshift(darwinMenu)
  menus.push(beakerDevMenu) // TODO: remove in release build?
  return menus
}

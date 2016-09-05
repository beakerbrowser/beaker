import { app, BrowserWindow, dialog } from 'electron'
import { createShellWindow } from './windows'

var darwinMenu = {
  label: 'Beaker',
  submenu: [
    { label: 'About Beaker', role: 'about' },
    { type: 'separator' },
    { label: 'Services', role: 'services', submenu: [] },
    { type: 'separator' },
    { label: 'Hide Beaker', accelerator: 'Command+H', role: 'hide' },
    { label: 'Hide Others', accelerator: 'Command+Alt+H', role: 'hideothers' },
    { label: 'Show All', role: 'unhide' },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'Command+Q', click() { app.quit() } }
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
            if (files && files[0])
              win.webContents.send('command', 'file:new-tab', 'file://'+files[0])
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
    { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
    { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
    { type: "separator" },
    { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
    { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
    { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
    { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
    {
      label: "Find in Page",
      accelerator: "CmdOrCtrl+F",
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
      if (win) win.webContents.send('command', 'view:hard-reload') 
    }
  },
  { type: "separator" },
  {
    label: 'Zoom In',
    accelerator: 'CmdOrCtrl+=',
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
  { type: "separator" },
  {
    label: 'Toggle DevTools',
    accelerator: 'Alt+CmdOrCtrl+I',
    click: function (item, win) {
      if (win) win.webContents.send('command', 'view:toggle-dev-tools') 
    }
  }]
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
      accelerator: 'CmdOrCtrl+]',
      click: function (item, win) {
        if (win) win.webContents.send('command', 'window:next-tab')
      }
    },
    {
      label: 'Previous Tab',
      accelerator: 'CmdOrCtrl+[',
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
  },{
    label: 'Toggle Shell-Window DevTools',
    click: function () {
      BrowserWindow.getFocusedWindow().toggleDevTools()
    }
  }]
}

export default function buildWindowMenu (env) {
  var menus = [fileMenu, editMenu, viewMenu, historyMenu, windowMenu]
  if (process.platform === 'darwin') menus.unshift(darwinMenu)
  if (env.name !== 'production') menus.push(beakerDevMenu)
  return menus
}
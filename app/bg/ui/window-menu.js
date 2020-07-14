import { app, BrowserWindow, dialog, Menu } from 'electron'
import { createShellWindow, toggleShellInterface, getActiveWindow, getFocusedDevToolsHost } from './windows'
import { runSelectFileDialog, runForkFlow, runDrivePropertiesFlow, exportDriveToFilesystem, importFilesystemToDrive } from './util'
import * as tabManager from './tabs/manager'
import * as viewZoom from './tabs/zoom'
import * as shellMenus from './subwindows/shell-menus'
import { download } from './downloads'
import hyper from '../hyper/index'
import * as settingsDb from '../dbs/settings'

// globals
// =

var currentMenuTemplate

// exported APIs
// =

export function setup () {
  setApplicationMenu({noWindows: true})

  // watch for changes to the currently active window
  app.on('browser-window-focus', async (e, win) => {
    try {
      setApplicationMenu()
    } catch (e) {
      // `pages` not set yet
    }
  })

  // watch for all windows to be closed
  app.on('custom-window-all-closed', () => {
    setApplicationMenu({noWindows: true})
  })

  // watch for any window to be opened
  app.on('browser-window-created', () => {
    setApplicationMenu()
  })
}

export function onSetCurrentLocation (win) {
  // check if this is the currently focused window
  if (win !== BrowserWindow.getFocusedWindow()) {
    return
  }
  setApplicationMenu()
}

export function setApplicationMenu (opts = {}) {
  currentMenuTemplate = buildWindowMenu(opts)
  Menu.setApplicationMenu(Menu.buildFromTemplate(currentMenuTemplate))
}

export function buildWindowMenu (opts = {}) {
  var win = opts.noWindows ? undefined : opts.win ? opts.win : getActiveWindow()
  if (win && win.isDestroyed()) win = undefined
  const noWindows = !win
  const tab = !noWindows && win ? tabManager.getActive(win) : undefined
  const url = tab ? (tab.url || tab.loadingURL) : ''
  const isDriveSite = url.startsWith('hyper://')
  const driveInfo = isDriveSite ? tab.driveInfo : undefined
  const isWritable = driveInfo && driveInfo.writable

  var darwinMenu = {
    label: 'Beaker',
    submenu: [
      {
        label: 'Preferences',
        accelerator: 'Cmd+,',
        click (item) {
          if (win) tabManager.create(win, 'beaker://settings', {setActive: true})
          else createShellWindow({ pages: ['beaker://settings'] })
        }
      },
      { type: 'separator' },
      { label: 'Services', role: 'services', submenu: [] },
      { type: 'separator' },
      { label: 'Hide Beaker', accelerator: 'Cmd+H', role: 'hide' },
      { label: 'Hide Others', accelerator: 'Cmd+Alt+H', role: 'hideothers' },
      { label: 'Show All', role: 'unhide' },
      { type: 'separator' },
      {
        id: 'quit',
        label: 'Quit',
        accelerator: 'Cmd+Q',
        async click () {
          var runBackground = await settingsDb.get('run_background')
          if (runBackground == 1) {
            for (let win of BrowserWindow.getAllWindows()) {
              win.close()
            }
          } else {
            app.quit()
          }
        },
        reserved: true
      }
    ]
  }

  var fileMenu = {
    label: 'File',
    submenu: [
      {
        id: 'newTab',
        label: 'New Tab',
        accelerator: 'CmdOrCtrl+T',
        click: function (item) {
          if (win) {
            tabManager.create(win, undefined, {setActive: true, focusLocationBar: true})
          } else {
            createShellWindow()
          }
        },
        reserved: true
      },
      {
        id: 'newWindow',
        label: 'New Window',
        accelerator: 'CmdOrCtrl+N',
        click: function () { createShellWindow() },
        reserved: true
      },
      { type: 'separator' },
      {
        id: 'openFile',
        label: 'Open File',
        accelerator: 'CmdOrCtrl+O',
        click: item => {
          createWindowIfNone(win, async (win) => {
            var res = await runSelectFileDialog(win, {
              buttonLabel: 'Open File'
            })
            tabManager.create(win, res[0].url, {setActive: true, adjacentActive: true})
          })
        }
      },
      { type: 'separator' },
      // TODO
      // {
      //   id: 'savePageAs',
      //   label: 'Save Page As...',
      //   enabled: !noWindows,
      //   accelerator: 'CmdOrCtrl+Shift+S',
      //   click: async (item) => {
      //     createWindowIfNone(getWin(), async (win) => {
      //       if (!tab) return
      //       const {url, title} = tab
      //       var res = await runSelectFileDialog(win, {
      //         saveMode: true,
      //         title: `Save ${title} as...`,
      //         buttonLabel: 'Save Page',
      //         defaultFilename: url.split('/').filter(Boolean).pop() || 'index.html',
      //         drive: url.startsWith('hyper:') ? url : undefined
      //       })
      //       let drive = await hyper.drives.getOrLoadDrive(res.origin)
      //       await drive.pda.writeFile(res.path, await fetch(url))
      //       tabManager.create(win, res.url, {setActive: true, adjacentActive: true})
      //     })
      //   }
      // },
      {
        id: 'exportPageAs',
        label: 'Export Page As...',
        enabled: !noWindows,
        click: async (item) => {
          if (!tab) return
          const {url, title} = tab
          var {filePath} = await dialog.showSaveDialog({ title: `Save ${title} as...`, defaultPath: app.getPath('downloads') })
          if (filePath) download(win, win.webContents, url, { saveAs: filePath, suppressNewDownloadEvent: true })
        }
      },
      {
        id: 'print',
        label: 'Print',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+P',
        click: (item) => {
          if (!tab) return
          tab.webContents.print()
        }
      },
      { type: 'separator' },
      {
        id: 'reopenClosedTab',
        label: 'Reopen Closed Tab',
        accelerator: 'CmdOrCtrl+Shift+T',
        click: function (item) {
          createWindowIfNone(win, (win) => {
            tabManager.reopenLastRemoved(win)
          })
        },
        reserved: true
      },
      {
        id: 'closeTab',
        label: 'Close Tab',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+W',
        click: function (item) {
          if (win) {
            // a regular browser window
            let active = tabManager.getActive(win)
            if (active) active.removePane(active.activePane)
          } else {
            // devtools
            let wc = getFocusedDevToolsHost()
            if (wc) {
              wc.closeDevTools()
            }
          }
        },
        reserved: true
      },
      {
        id: 'closeWindow',
        label: 'Close Window',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Shift+W',
        click: function (item) {
          if (win) win.close()
        },
        reserved: true
      }
    ]
  }

  var editMenu = {
    label: 'Edit',
    submenu: [
      { id: 'undo', label: 'Undo', enabled: !noWindows, accelerator: 'CmdOrCtrl+Z', selector: 'undo:', reserved: true },
      { id: 'redo', label: 'Redo', enabled: !noWindows, accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:', reserved: true },
      { type: 'separator' },
      { id: 'cut', label: 'Cut', enabled: !noWindows, accelerator: 'CmdOrCtrl+X', selector: 'cut:', reserved: true },
      { id: 'copy', label: 'Copy', enabled: !noWindows, accelerator: 'CmdOrCtrl+C', selector: 'copy:', reserved: true },
      { id: 'paste', label: 'Paste', enabled: !noWindows, accelerator: 'CmdOrCtrl+V', selector: 'paste:', reserved: true },
      { id: 'selectAll', label: 'Select All', enabled: !noWindows, accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
      { type: 'separator' },
      {
        id: 'findInPage',
        label: 'Find in Page',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+F',
        click: function (item) {
          if (tab) tab.showInpageFind()
        }
      },
      {
        id: 'findNext',
        label: 'Find Next',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+G',
        click: function (item) {
          if (tab) tab.moveInpageFind(1)
        }
      },
      {
        id: 'findPrevious',
        label: 'Find Previous',
        enabled: !noWindows,
        accelerator: 'Shift+CmdOrCtrl+G',
        click: function (item) {
          if (tab) tab.moveInpageFind(-1)
        }
      }
    ]
  }

  var viewMenu = {
    label: 'View',
    submenu: [
      {
        id: 'reload',
        label: 'Reload',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+R',
        click: function (item) {
          if (tab) tab.webContents.reload()
        },
        reserved: true
      },
      {
        id: 'hardReload',
        label: 'Hard Reload (Clear Cache)',
        accelerator: 'CmdOrCtrl+Shift+R',
        enabled: !noWindows,
        click: function (item) {
          if (tab) tab.webContents.reloadIgnoringCache()
        },
        reserved: true
      },
      {type: 'separator'},
      {
        id: 'zoomIn',
        label: 'Zoom In',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Plus',
        reserved: true,
        click: function (item) {
          if (tab) viewZoom.zoomIn(tab)
        }
      },
      {
        id: 'zoomOut',
        label: 'Zoom Out',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+-',
        reserved: true,
        click: function (item) {
          if (tab) viewZoom.zoomOut(tab)
        }
      },
      {
        id: 'actualSize',
        label: 'Actual Size',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+0',
        click: function (item) {
          if (tab) viewZoom.zoomReset(tab)
        }
      },
      {type: 'separator'},
      {
        id: 'splitPaneVertical',
        label: 'Split Pane Vertically',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+E',
        click () {
          if (tab && tab.activePane) {
            tab.splitPane(tab.activePane, 'vert')
          }
        }
      },
      {
        id: 'splitPaneHorizontal',
        label: 'Split Pane Horizontally',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Shift+E',
        click () {
          if (tab && tab.activePane) {
            tab.splitPane(tab.activePane, 'horz')
          }
        }
      },
      {type: 'separator'},
      {
        id: 'selectPaneUp',
        label: 'Select Pane Up',
        enabled: !noWindows,
        accelerator: `${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Up`,
        click () {
          if (tab && tab.activePane) {
            tab.activateAdjacentPane('up')
          }
        }
      },
      {
        id: 'selectPaneDown',
        label: 'Select Pane Down',
        enabled: !noWindows,
        accelerator: `${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Down`,
        click () {
          if (tab && tab.activePane) {
            tab.activateAdjacentPane('down')
          }
        }
      },
      {
        id: 'selectPaneLeft',
        label: 'Select Pane Left',
        enabled: !noWindows,
        accelerator: `${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Left`,
        click () {
          if (tab && tab.activePane) {
            tab.activateAdjacentPane('left')
          }
        }
      },
      {
        id: 'selectPaneRight',
        label: 'Select Pane Right',
        enabled: !noWindows,
        accelerator: `${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Right`,
        click () {
          if (tab && tab.activePane) {
            tab.activateAdjacentPane('right')
          }
        }
      },
      {type: 'separator'},
      {
        id: 'movePaneUp',
        label: 'Move Pane Up',
        enabled: !noWindows,
        accelerator: `Shift+${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Up`,
        click () {
          if (tab && tab.activePane) {
            tab.movePane(tab.activePane, 'up')
          }
        }
      },
      {
        id: 'movePaneDown',
        label: 'Move Pane Down',
        enabled: !noWindows,
        accelerator: `Shift+${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Down`,
        click () {
          if (tab && tab.activePane) {
            tab.movePane(tab.activePane, 'down')
          }
        }
      },
      {
        id: 'movePaneLeft',
        label: 'Move Pane Left',
        enabled: !noWindows,
        accelerator: `Shift+${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Left`,
        click () {
          if (tab && tab.activePane) {
            tab.movePane(tab.activePane, 'left')
          }
        }
      },
      {
        id: 'movePaneRight',
        label: 'Move Pane Right',
        enabled: !noWindows,
        accelerator: `Shift+${(process.platform !== 'darwin') ? 'Ctrl+Alt' : 'Ctrl+Cmd'}+Right`,
        click () {
          if (tab && tab.activePane) {
            tab.movePane(tab.activePane, 'right')
          }
        }
      }
    ]
  }

  var driveMenu = {
    label: 'Drive',
    submenu: [
      {
        id: 'toggleFilesExplorer',
        label: 'Explore Files',
        enabled: !noWindows && !!isDriveSite,
        click: async function (item) {
          if (tab) tab.togglePaneByOrigin({url: 'beaker://explorer/'})
        }
      },
      {type: 'separator'},
      {
        id: 'forkDrive',
        label: 'Fork Drive',
        enabled: !!isDriveSite,
        async click (item) {
          if (win) {
            let newUrl = await runForkFlow(win, url)
            tabManager.create(win, newUrl, {setActive: true})
          }
        }
      },
      {
        id: 'diffMerge',
        label: 'Diff / Merge',
        enabled: !!isDriveSite,
        async click (item) {
          if (win) tabManager.create(win, `beaker://diff/?base=${url}`, {setActive: true})
        }
      },
      { type: 'separator' },
      {
        id: 'importFiles',
        label: 'Import Files',
        enabled: !noWindows && isDriveSite && isWritable,
        click: async (item) => {
          if (!driveInfo || !driveInfo.writable) return
          var {filePaths} = await dialog.showOpenDialog({
            title: `Import Files`,
            buttonLabel: 'Select File(s)',
            properties: ['openFile', 'multiSelections']
          })
          if (!filePaths[0]) return
          var res = await runSelectFileDialog(win, {
            title: 'Choose where to import to',
            buttonLabel: 'Import File(s)',
            drive: driveInfo.url,
            select: 'folder'
          })
          var targetUrl = res[0].url
          let confirmation = await dialog.showMessageBox({
            type: 'question',
            message: `Import ${filePaths.length > 1 ? `${filePaths.length} files` : filePaths[0]} to ${targetUrl}? Any conflicting files will be overwritten.`,
            buttons: ['OK', 'Cancel']
          })
          if (confirmation.response !== 0) return
          for (let filePath of filePaths) {
            await importFilesystemToDrive(filePath, targetUrl)
          }
          dialog.showMessageBox({message: 'Import complete'})
        }
      },
      {
        id: 'importFolder',
        label: 'Import Folder',
        enabled: !noWindows && isDriveSite && isWritable,
        click: async (item) => {
          if (!driveInfo || !driveInfo.writable) return
          var {filePaths} = await dialog.showOpenDialog({
            title: `Import Folder`,
            buttonLabel: 'Select Folder(s)',
            properties: ['openDirectory', 'multiSelections']
          })
          if (!filePaths[0]) return
          var res = await runSelectFileDialog(win, {
            title: 'Choose where to import to',
            buttonLabel: 'Import Folder(s)',
            drive: driveInfo.url,
            select: 'folder'
          })
          var targetUrl = res[0].url
          let confirmation = await dialog.showMessageBox({
            type: 'question',
            message: `Import ${filePaths.length > 1 ? `${filePaths.length} folders` : filePaths[0]} to ${targetUrl}? Any conflicting files will be overwritten.`,
            buttons: ['OK', 'Cancel']
          })
          if (confirmation.response !== 0) return
          for (let filePath of filePaths) {
            await importFilesystemToDrive(filePath, targetUrl, {preserveFolder: true})
          }
          dialog.showMessageBox({message: 'Import complete'})
        }
      },
      {
        id: 'exportFiles',
        label: 'Export Files',
        enabled: !noWindows && isDriveSite,
        click: async (item) => {
          if (!driveInfo) return
          var {filePaths} = await dialog.showOpenDialog({
            title: `Export Drive Files`,
            buttonLabel: 'Export',
            properties: ['openDirectory', 'createDirectory']
          })
          if (!filePaths[0]) return
          let confirmation = await dialog.showMessageBox({
            type: 'question',
            message: `Export ${driveInfo.title || driveInfo.key} to ${filePaths[0]}? Any conflicting files will be overwritten.`,
            buttons: ['OK', 'Cancel']
          })
          if (confirmation.response !== 0) return
          await exportDriveToFilesystem(driveInfo.url, filePaths[0])
          dialog.showMessageBox({message: 'Export complete'})
        }
      },
      {type: 'separator'},
      {
        id: 'driveProperties',
        label: 'Drive Properties',
        enabled: !!isDriveSite,
        async click (item) {
          if (win) runDrivePropertiesFlow(win, hyper.drives.fromURLToKey(url))
        }
      }
    ]
  }

  var showHistoryAccelerator = 'Ctrl+H'

  if (process.platform === 'darwin') {
    showHistoryAccelerator = 'Cmd+Y'
  }

  var historyMenu = {
    label: 'History',
    role: 'history',
    submenu: [
      {
        id: 'back',
        label: 'Back',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Left',
        click: function (item) {
          if (tab) tab.webContents.goBack()
        }
      },
      {
        id: 'forward',
        label: 'Forward',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Right',
        click: function (item) {
          if (tab) tab.webContents.goForward()
        }
      },
      {
        id: 'showFullHistory',
        label: 'Show Full History',
        accelerator: showHistoryAccelerator,
        click: function (item) {
          if (win) tabManager.create(win, 'beaker://history', {setActive: true})
          else createShellWindow({ pages: ['beaker://history'] })
        }
      },
      { type: 'separator' },
      {
        id: 'bookmarkThisPage',
        label: 'Bookmark this Page',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+D',
        click: function (item) {
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
        submenu: [
          {
            label: 'Reload Shell-Window',
            enabled: !noWindows,
            click: function () {
              win.webContents.reloadIgnoringCache()
            }
          },
          {
            label: 'Toggle Shell-Window DevTools',
            enabled: !noWindows,
            click: function () {
              win.webContents.openDevTools({mode: 'detach'})
            }
          }
        ]
      },
      {
        id: 'toggleDevTools',
        label: 'Toggle DevTools',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+I' : 'Shift+CmdOrCtrl+I',
        click: function (item) {
          if (tab) tab.webContents.toggleDevTools()
        },
        reserved: true
      },
      {
        id: 'toggleEditor',
        label: 'Toggle Editor',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+B',
        click: async function (item) {
          if (tab) tab.togglePaneByOrigin({url: 'beaker://editor/'})
        }
      },
      {
        id: 'toggleTerminal',
        label: 'Toggle Terminal',
        enabled: !noWindows,
        accelerator: 'Ctrl+`',
        click: function (item) {
          if (tab) tab.togglePaneByOrigin({url: 'beaker://webterm/'})
        }
      },
      {
        id: 'toggleLiveReloading',
        label: 'Toggle Live Reloading',
        enabled: !!isDriveSite,
        click: function (item) {
          if (tab) tab.toggleLiveReloading()
        }
      }
    ]
  }

  const gotoTabShortcut = index => ({
    label: `Tab ${index}`,
    enabled: !noWindows,
    accelerator: `CmdOrCtrl+${index + 1}`,
    click: function (item) {
      if (win) {
        shellMenus.hide(win) // HACK: closes the background tray if it's open
        tabManager.setActive(win, index - 1)
      }
    }
  })
  var windowMenu = {
    label: 'Window',
    role: 'window',
    submenu: [
      {
        id: 'toggleAlwaysOnTop',
        type: 'checkbox',
        label: 'Always on Top',
        checked: (win ? win.isAlwaysOnTop() : false),
        click: function () {
          if (win) win.setAlwaysOnTop(!win.isAlwaysOnTop())
        }
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {type: 'separator'},
      {
        id: 'toggleFullScreen',
        label: 'Full Screen',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Ctrl+Cmd+F' : 'F11',
        role: 'toggleFullScreen',
        click: function () {
          if (win) {
            win.setFullScreen(!win.isFullScreen())
          }
        }
      },
      {
        id: 'toggleBrowserUi',
        label: 'Toggle Browser UI',
        enabled: !noWindows,
        accelerator: 'CmdOrCtrl+Shift+H',
        click: function (item) {
          if (win) toggleShellInterface(win)
        }
      },
      {
        id: 'focusLocationBar',
        label: 'Focus Location Bar',
        accelerator: 'CmdOrCtrl+L',
        click: function (item) {
          createWindowIfNone(win, (win) => {
            win.webContents.send('command', 'focus-location')
          })
        }
      },
      {type: 'separator'},
      {
        id: 'nextTab',
        label: 'Next Tab',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+Right' : 'CmdOrCtrl+PageDown',
        click: function (item) {
          if (win) tabManager.changeActiveBy(win, 1)
        }
      },
      {
        id: 'previousTab',
        label: 'Previous Tab',
        enabled: !noWindows,
        accelerator: (process.platform === 'darwin') ? 'Alt+CmdOrCtrl+Left' : 'CmdOrCtrl+PageUp',
        click: function (item) {
          if (win) tabManager.changeActiveBy(win, -1)
        }
      },
      {
        label: 'Tab Shortcuts',
        type: 'submenu',
        submenu: [
          {
            label: `Background Tabs`,
            enabled: !noWindows,
            accelerator: `CmdOrCtrl+1`,
            click: function (item) {
              if (win) shellMenus.toggle(win, 'background-tray')
            }
          },
          gotoTabShortcut(1),
          gotoTabShortcut(2),
          gotoTabShortcut(3),
          gotoTabShortcut(4),
          gotoTabShortcut(5),
          gotoTabShortcut(6),
          gotoTabShortcut(7),
          {
            label: `Last Tab`,
            enabled: !noWindows,
            accelerator: `CmdOrCtrl+9`,
            click: function (item) {
              if (win) tabManager.setActive(win, tabManager.getAll(win).slice(-1)[0])
            }
          }
        ]
      },
      {
        id: 'popOutTab',
        label: 'Pop Out Tab',
        enabled: !noWindows,
        accelerator: 'Shift+CmdOrCtrl+P',
        click: function (item) {
          if (tab) tabManager.popOutTab(tab)
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
        id: 'beakerHelp',
        label: 'Beaker Help',
        accelerator: 'F1',
        click: function (item) {
          if (win) tabManager.create(win, 'https://docs.beakerbrowser.com/', {setActive: true})
        }
      },
      {
        id: 'developerPortal',
        label: 'Developer Portal',
        click: function (item) {
          if (win) tabManager.create(win, 'https://beaker.dev/', {setActive: true})
        }
      },
      {type: 'separator'},
      {
        id: 'reportIssue',
        label: 'Report Issue',
        click: function (item) {
          if (win) tabManager.create(win, 'https://github.com/beakerbrowser/beaker/issues', {setActive: true})
        }
      },
      {
        id: 'beakerDiscussions',
        label: 'Discussion Forum',
        click: function (item) {
          if (win) tabManager.create(win, 'https://github.com/beakerbrowser/beaker/discussions', {setActive: true})
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
        if (win) tabManager.create(win, 'beaker://settings', {setActive: true})
      }
    })
  }

  // assemble final menu
  var menus = [fileMenu, editMenu, viewMenu, driveMenu, historyMenu, developerMenu, windowMenu, helpMenu]
  if (process.platform === 'darwin') menus.unshift(darwinMenu)
  return menus
}

export function getToolbarMenu () {
  if (!currentMenuTemplate) return {}
  const get = label => toToolbarItems(currentMenuTemplate.find(menu => menu.label === label).submenu)
  function toToolbarItems (items){
    items = items.map(item => {
      if (item.type === 'separator') {
        return {separator: true}
      }
      if (!item.id) return false
      return {
        id: item.id,
        label: item.label,
        accelerator: item.accelerator,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true
      }
    }).filter(Boolean)
    while (items[0].separator) items.shift()
    while (items[items.length - 1].separator) items.pop()
    return items
  }
  return {
    File: get('File'),
    Drive: get('Drive'),
    Developer: get('Developer'),
    Window: get('Window'),
    Help: get('Help')
  }
}

export function triggerMenuItemById (menuLabel, id) {
  if (!currentMenuTemplate) return
  var items = currentMenuTemplate.find(menu => menu.label === menuLabel).submenu
  if (!items) return
  var item = items.find(item => item.id === id)
  return item.click()
}

// internal helpers
// =

function createWindowIfNone (win, onShow) {
  if (win) return onShow(win)
  win = createShellWindow()
  win.once('show', onShow.bind(null, win))
}

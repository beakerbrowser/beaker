import {ipcMain} from 'electron'
import * as windows from './ui/windows'

// exported api
// =

export function setup () {
  console.log('Test driver enabled, listening for messages')
  process.on('message', onMessage)
}

// internal methods
// =

async function onMessage ({msgId, cmd, args}) {
  var method = METHODS[cmd]
  if (!method) method = () => new Error('Invalid method: ' + cmd)
  try {
    var resolve = await method(...args)
    process.send({msgId, resolve})
  } catch (err) {
    var reject = {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
    process.send({msgId, reject})
  }
}

const METHODS = {
  isReady () {
    return new Promise(resolve => ipcMain.once('shell-window:ready', () => resolve()))
  },

  newTab () {
    return execute(`
      var index = pages.getAll().length
      page = pages.create()
      pages.setActive(page)
      index
    `)
  },

  navigateTo (page, url) {
    return execute(`
      var page = pages.get(${page})
      page.navbarEl.querySelector('.nav-location-input').value = "${url}"
      page.navbarEl.querySelector('.nav-location-input').blur()
      var loadPromise = new Promise(resolve => {
        function onDidStopLoading () {
          page.webviewEl.removeEventListener('did-stop-loading', onDidStopLoading)
          resolve()
        }
        page.webviewEl.addEventListener('did-stop-loading', onDidStopLoading)
      })
      page.loadURL("${url}")
      loadPromise
    `)
  },

  getUrl (page) {
    return execute(`
      var page = pages.get(${page})
      page.getURL()
    `)
  },

  async executeJavascriptInShell (js) {
    var res = await execute(js)
    return res
  },

  async executeJavascriptOnPage (page, js) {
    try {
      var res = await execute(`
        var page = pages.get(${page})
        page.webviewEl.getWebContents().executeJavaScript(\`` + js + `\`)
      `)
      return res
    } catch (e) {
      console.error('Failed to execute javascript on page', js, e)
      throw e
    }
  }
}

function execute (js) {
  var win = windows.getActiveWindow()
  return win.webContents.executeJavaScript(js)
}

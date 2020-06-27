import dgram from 'dgram'
import { ipcMain } from 'electron'
import * as windows from './ui/windows'
import * as tabManager from './ui/tabs/manager'
import * as permPrompt from './ui/subwindows/perm-prompt'
import * as modals from './ui/subwindows/modals'
import { getEnvVar } from './lib/env'

const LOG_MESSAGES = false

var testPort = +getEnvVar('BEAKER_TEST_DRIVER')
var sock

// exported api
// =

export function setup () {
  // setup socket
  sock = dgram.createSocket('udp4')
  sock.bind(0, '127.0.0.1')
  sock.on('message', onMessage)
  sock.on('listening', () => {
    console.log('Test driver enabled, listening for messages on port', sock.address().port)
  })

  // emit ready when ready
  var todos = 2
  sock.on('listening', hit)
  ipcMain.once('shell-window:ready', hit)
  function hit () {
    if (!(--todos)) {
      // HACK
      // there's some kind of race which causes `executeJavaScript` to not run in the shell window during tests
      // this timeout is intended to solve that
      // -prf
      setTimeout(() => {
        send({isReady: true, port: sock.address().port})
      }, 1e3)
    }
  }
}

// internal methods
// =

function send (obj) {
  if (LOG_MESSAGES) console.log('driverserver sent', JSON.stringify(obj))
  obj = Buffer.from(JSON.stringify(obj), 'utf8')
  sock.send(obj, 0, obj.length, testPort, '127.0.0.1', err => {
    if (err) console.log('Error communicating with the test driver', err)
  })
}

async function onMessage (message) {
  if (LOG_MESSAGES) console.log('driverserver got', message.toString('utf8'))
  const {msgId, cmd, args} = JSON.parse(message.toString('utf8'))
  var method = METHODS[cmd]
  if (!method) method = () => new Error('Invalid method: ' + cmd)
  try {
    var resolve = await method(...args)
    send({msgId, resolve})
  } catch (err) {
    var reject = {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
    send({msgId, reject})
  }
}

const METHODS = {
  newTab () {
    var win = getActiveWindow()
    var tab = tabManager.create(win, undefined, {setActive: true})
    return tabManager.getIndexOfTab(win, tab)
  },

  navigateTo (page, url) {
    var tab = tabManager.getByIndex(getActiveWindow(), page)
    var loadPromise = new Promise(resolve => tab.webContents.once('dom-ready', () => resolve()))
    tab.loadURL(url)
    return loadPromise
  },

  getUrl (page) {
    var tab = tabManager.getByIndex(getActiveWindow(), page)
    return tab.url
  },

  async executeJavascriptInShell (js) {
    var win = getActiveWindow()
    var res = await win.webContents.executeJavaScript(js)
    return res
  },

  async executeJavascriptOnPage (page, js) {
    var tab = tabManager.getByIndex(getActiveWindow(), page)
    var res = await tab.webContents.executeJavaScript(js)
    return res
  },

  async executeJavascriptInPermPrompt (page, js) {
    var tab = tabManager.getByIndex(getActiveWindow(), page).browserView
    var prompt = await waitFor(() => permPrompt.get(tab))
    var res = await prompt.webContents.executeJavaScript(js)
    return res
  },

  async executeJavascriptInModal (page, js) {
    var tab = tabManager.getByIndex(getActiveWindow(), page).browserView
    var modal = await waitFor(() => modals.get(tab))
    var res = await modal.webContents.executeJavaScript(js)
    return res
  }
}

function getActiveWindow () {
  var win = windows.getActiveWindow()
  while (win.getParentWindow()) {
    win = win.getParentWindow()
  }
  return win
}

function waitFor (condFn) {
  return new Promise(resolve => {
    var i = setInterval(async () => {
      var res = condFn()
      if (res) {
        clearInterval(i)
        return resolve(res)
      }
    }, 100)
  })
}
import dgram from 'dgram'
import {ipcMain} from 'electron'
import * as beakerCore from '@beaker/core'
import * as windows from './ui/windows'

var testPort = +beakerCore.getEnvVar('BEAKER_TEST_DRIVER')
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
    if (!(--todos)) send({isReady: true, port: sock.address().port})
  }
}

// internal methods
// =

function send (obj) {
  obj = Buffer.from(JSON.stringify(obj), 'utf8')
  sock.send(obj, 0, obj.length, testPort, '127.0.0.1', err => {
    if (err) console.log('Error communicating with the test driver', err)
  })
}

async function onMessage (message) {
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
        function onDomReady () {
          page.webviewEl.removeEventListener('dom-ready', onDomReady)
          resolve()
        }
        page.webviewEl.addEventListener('dom-ready', onDomReady)
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

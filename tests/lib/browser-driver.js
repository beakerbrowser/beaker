const childProcess = require('child_process')
const dgram = require('dgram')

const LOG_MESSAGES = false

exports.start = function (opts) {
  return new BrowserDriver(opts)
}

/*
UDP wire format
request: {msgId: Number, cmd, args: Array<string>}
response: {msgId: Number, resolve: any?, reject: any?}
special message:
isReady: {isReady: true, port: Number}
*/

class BrowserDriver {
  constructor ({path, args, env}) {
    this.rpcCalls = []
    this.testPort = null
    this.browserPort = null

    this.isReady = new Promise(async (resolve) => {
      // setup udp socket
      this.sock = dgram.createSocket('udp4')
      this.sock.on('error', err => {
        console.error('UDP socket error in browser-driver', err)
      })
      await new Promise(r => this.sock.bind(0, '127.0.0.1', r))
      this.testPort = this.sock.address().port

      // start child process
      env = Object.assign({}, env, process.env)
      env.BEAKER_TEST_DRIVER = this.testPort
      this.process = childProcess.spawn(path, args, {stdio: ['inherit', 'inherit', 'inherit'], env})

      // handle rpc responses
      this.sock.on('message', (message) => {
        message = JSON.parse(message.toString('utf8'))
        if (LOG_MESSAGES) console.log('driverclient got', message)

        // special handling for isReady message
        if (message.isReady) {
          this.browserPort = message.port
          return resolve()
        }

        // pop the handler
        var rpcCall = this.rpcCalls[message.msgId]
        if (!rpcCall) return
        this.rpcCalls[message.msgId] = null
        // reject/resolve
        if (message.reject) rpcCall.reject(message.reject)
        else rpcCall.resolve(message.resolve)
      })
    })
  }

  async rpc (cmd, ...args) {
    // send rpc request
    if (LOG_MESSAGES) console.log('driverclient sent', {msgId, cmd, args})
    var msgId = this.rpcCalls.length
    var msg = Buffer.from(JSON.stringify({msgId, cmd, args}), 'utf8')
    this.sock.send(msg, 0, msg.length, this.browserPort, '127.0.0.1', err => {
      if (err) console.error('UDP socket error in browser-driver', err)
    })
    return new Promise((resolve, reject) => this.rpcCalls.push({resolve, reject}))
  }

  getTab (page) {
    return new BrowserDriverTab(this, page)
  }

  async newTab () {
    var page = await this.rpc('newTab')
    return new BrowserDriverTab(this, page)
  }

  async executeJavascript (js) {
    return this.rpc('executeJavascriptInShell', js)
  }

  waitFor (js) {
    return new Promise(resolve => {
      var i = setInterval(async () => {
        var res = await this.executeJavascript(js)
        if (!!res) {
          clearInterval(i)
          return resolve()
        }
      }, 100)
    })
  }

  async doesExist (sel) {
    return this.executeJavascript(`
      !!document.querySelector('${sel}')
    `)
  }

  waitForElement (sel) {
    return this.waitFor(`
      !!document.querySelector('${sel}')
    `)
  }

  async click (sel) {
    this.executeJavascript(`
      document.querySelector('${sel}').click()
    `)
  }

  async setValue (sel, value) {
    this.executeJavascript(`
      (function () {
        let el = document.querySelector('input[name="title"]')
        el.value = 'The Title'
        el.dispatchEvent(new Event('change'))
      })()
    `)
  }

  async stop () {
    this.process.kill()
    await new Promise(resolve => {
      this.sock.close(resolve)
    })
  }
}

class BrowserDriverTab {
  constructor (driver, page) {
    this.driver = driver
    this.page = page
  }

  async navigateTo (url) {
    return this.driver.rpc('navigateTo', this.page, url)
  }

  async getUrl () {
    return this.driver.rpc('getUrl', this.page)
  }

  async executeJavascript (js) {
    return this.driver.rpc('executeJavascriptOnPage', this.page, js)
  }

  waitFor (js) {
    return new Promise(resolve => {
      var i = setInterval(async () => {
        var res = await this.executeJavascript(js)
        if (!!res) {
          clearInterval(i)
          return resolve()
        }
      }, 100)
    })
  }

  async doesExist (sel) {
    return this.executeJavascript(`
      !!document.querySelector('${sel}')
    `)
  }

  waitForElement (sel) {
    return this.waitFor(`
      !!document.querySelector('${sel}')
    `)
  }

  async click (sel) {
    this.executeJavascript(`
      document.querySelector('${sel}').click()
    `)
  }

  async setValue (sel, value) {
    this.executeJavascript(`
      (function () {
        let el = document.querySelector('input[name="title"]')
        el.value = 'The Title'
        el.dispatchEvent(new Event('change'))
      })()
    `)
  }
}

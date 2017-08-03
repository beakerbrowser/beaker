import rpc from 'pauls-electron-rpc'
import errors from 'beaker-error-constants'
import parseDatURL from 'parse-dat-url'
import datArchiveManifest from '../api-manifests/external/dat-archive'
import {EventTarget, fromEventStream} from './event-target'
import Stat from './stat'

const URL_PROMISE = Symbol('URL_PROMISE')

// create the dat rpc api
const dat = rpc.importAPI('dat-archive', datArchiveManifest, { timeout: false, errors })

export default class DatArchive extends EventTarget {
  constructor (url) {
    super()
    var errStack = (new Error()).stack

    // simple case: new DatArchive(window.location)
    if (url === window.location) {
      url = window.location.toString()
    }

    // basic URL validation
    if (!url || typeof url !== 'string') {
      throwWithFixedStack(new Error('Invalid dat:// URL'), errStack)
    }

    // parse the URL
    const urlParsed = parseDatURL(url)
    if (!urlParsed || urlParsed.protocol !== 'dat:') {
      throwWithFixedStack(new Error('Invalid URL: must be a dat:// URL'), errStack)
    }
    url = 'dat://' + urlParsed.hostname

    // load into the 'active' (in-memory) cache
    dat.loadArchive(url)

    // resolve the URL (DNS)
    const urlPromise = DatArchive.resolveName(url).then(url => {
      if (urlParsed.version) {
        url += `+${urlParsed.version}`
      }
      return 'dat://' + url
    })
    Object.defineProperty(this, URL_PROMISE, {
      enumerable: false,
      value: urlPromise
    })

    // define this.url as a frozen getter
    Object.defineProperty(this, 'url', {
      enumerable: true,
      value: url
    })
  }

  static create (opts = {}) {
    var errStack = (new Error()).stack
    return dat.createArchive(opts)
      .then(newUrl => new DatArchive(newUrl))
      .catch(e => throwWithFixedStack(e, errStack))
  }

  static fork (url, opts = {}) {
    var errStack = (new Error()).stack
    url = (typeof url.url === 'string') ? url.url : url
    if (!isDatURL(url)) {
      throwWithFixedStack(new Error('Invalid URL: must be a dat:// URL'), errStack)
    }
    return dat.forkArchive(url, opts)
      .then(newUrl => new DatArchive(newUrl))
      .catch(e => throwWithFixedStack(e, errStack))
  }

  async getInfo (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await dat.getInfo(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async diff (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await dat.diff(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async commit (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await dat.commit(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async revert (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await dat.revert(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async history (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await dat.history(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async stat (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return new Stat(await dat.stat(url, opts))
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async readFile (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return await dat.readFile(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async writeFile (path, data, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return await dat.writeFile(url, data, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async unlink (path) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return await dat.unlink(url)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  // TODO copy-disabled
  /* async copy(path, dstPath) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.copy(url, dstPath)
  } */

  // TODO rename-disabled
  /* async rename(path, dstPath) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.rename(url, dstPath)
  } */

  async download (path = '/', opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return await dat.download(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async readdir (path = '/', opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      var names = await dat.readdir(url, opts)
      if (opts.stat) {
        names.forEach(name => { name.stat = new Stat(name.stat) })
      }
      return names
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async mkdir (path) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return await dat.mkdir(url)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async rmdir (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      url = joinPath(url, path)
      return await dat.rmdir(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  createFileActivityStream (pathSpec = null) {
    var errStack = (new Error()).stack
    try {
      return fromEventStream(dat.createFileActivityStream(this.url, pathSpec))
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  createNetworkActivityStream () {
    var errStack = (new Error()).stack
    try {
      return fromEventStream(dat.createNetworkActivityStream(this.url))
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  static async importFromFilesystem (opts = {}) {
    var errStack = (new Error()).stack
    try {
      return await dat.importFromFilesystem(opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  static async exportToFilesystem (opts = {}) {
    var errStack = (new Error()).stack
    try {
      return await dat.exportToFilesystem(opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  static async exportToArchive (opts = {}) {
    var errStack = (new Error()).stack
    try {
      return await dat.exportToArchive(opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  static async resolveName (name) {
    var errStack = (new Error()).stack
    try {
      // simple case: DatArchive.resolveName(window.location)
      if (name === window.location) {
        name = window.location.toString()
      }
      return await dat.resolveName(name)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  static selectArchive (opts = {}) {
    var errStack = (new Error()).stack
    return dat.selectArchive(opts)
      .then(url => new DatArchive(url))
      .catch(e => throwWithFixedStack(e, errStack))
  }
}

function isDatURL (url) {
  var urlp = parseDatURL(url)
  return urlp && urlp.protocol === 'dat:'
}

function joinPath (url, path) {
  if (path.charAt(0) === '/') return url + path
  return url + '/' + path
}

function throwWithFixedStack (e, errStack) {
  e = e || new Error()
  e.stack = e.stack.split('\n')[0] + '\n' + errStack.split('\n').slice(2).join('\n')
  throw e
}

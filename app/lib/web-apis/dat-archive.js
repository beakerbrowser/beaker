import rpc from 'pauls-electron-rpc'
import errors from 'beaker-error-constants'
import parseDatURL from 'parse-dat-url'
import datArchiveManifest from '../api-manifests/external/dat-archive'
import workspaceFsManifest from '../api-manifests/external/workspace-fs'
import {EventTarget, fromEventStream} from './event-target'
import Stat from './stat'

const LOAD_PROMISE = Symbol('LOAD_PROMISE')
const URL_PROMISE = Symbol('URL_PROMISE')
const API = Symbol()
const IS_WORKSPACE = Symbol()

// create the rpc apis
const dat = rpc.importAPI('dat-archive', datArchiveManifest, { timeout: false, errors })
const wsfs = rpc.importAPI('workspace-fs', workspaceFsManifest, { timeout: false, errors })

class DatArchive extends EventTarget {
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
    if (!urlParsed || (urlParsed.protocol !== 'dat:' && urlParsed.protocol !== 'workspace:')) {
      throwWithFixedStack(new Error('Invalid URL: must be a dat:// URL'), errStack)
    }
    setHidden(this, IS_WORKSPACE, (urlParsed.protocol === 'workspace:'))
    if (this[IS_WORKSPACE]) {
      url = 'workspace://' + urlParsed.hostname
    } else {
      url = 'dat://' + urlParsed.hostname + (urlParsed.version ? `+${urlParsed.version}` : '')
    }

    // select the API
    setHidden(this, API, (this[IS_WORKSPACE]) ? wsfs : dat)

    // load into the 'active' (in-memory) cache
    setHidden(this, LOAD_PROMISE, ((this[IS_WORKSPACE]) ? true : dat.loadArchive(url)))

    // resolve the URL (DNS)
    if (this[IS_WORKSPACE]) {
      setHidden(this, URL_PROMISE, url)
    } else {
      const urlPromise = DatArchive.resolveName(url).then(url => {
        if (urlParsed.version) {
          url += `+${urlParsed.version}`
        }
        return 'dat://' + url
      })
      setHidden(this, URL_PROMISE, urlPromise)
    }

    // define this.url as a frozen getter
    Object.defineProperty(this, 'url', {
      enumerable: true,
      value: url
    })
  }

  static load (url) {
    var errStack = (new Error()).stack
    const a = new DatArchive(url)
    return Promise.all([a[LOAD_PROMISE], a[URL_PROMISE]])
      .then(() => a)
      .catch(e => throwWithFixedStack(e, errStack))
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

  static unlink (url) {
    var errStack = (new Error()).stack
    url = (typeof url.url === 'string') ? url.url : url
    if (!isDatURL(url)) {
      throwWithFixedStack(new Error('Invalid URL: must be a dat:// URL'), errStack)
    }
    return dat.unlinkArchive(url)
      .catch(e => throwWithFixedStack(e, errStack))
  }

  async getInfo (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].getInfo(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async configure (info, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].configure(url, info, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async diff (opts = {}) {
    // noop
    console.warn('The DatArchive diff() API has been deprecated.')
    return []
  }

  async commit (opts = {}) {
    // noop
    console.warn('The DatArchive commit() API has been deprecated.')
    return []
  }

  async revert (opts = {}) {
    // noop
    console.warn('The DatArchive revert() API has been deprecated.')
    return []
  }

  async history (opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].history(url, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async stat (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return new Stat(await this[API].stat(url, path, opts))
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async readFile (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].readFile(url, path, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async writeFile (path, data, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].writeFile(url, path, data, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async unlink (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].unlink(url, path, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async copy (path, dstPath, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return this[API].copy(url, path, dstPath, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async rename (path, dstPath, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return this[API].rename(url, path, dstPath, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async download (path = '/', opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].download(url, path, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async readdir (path = '/', opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      var names = await this[API].readdir(url, path, opts)
      if (opts.stat) {
        names.forEach(name => { name.stat = new Stat(name.stat) })
      }
      return names
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async mkdir (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].mkdir(url, path, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  async rmdir (path, opts = {}) {
    var errStack = (new Error()).stack
    try {
      var url = await this[URL_PROMISE]
      return await this[API].rmdir(url, path, opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  createFileActivityStream (pathSpec = null) {
    console.warn('The DatArchive createFileActivityStream() API has been deprecated, use watch() instead.')
    return this.watch(pathSpec)
  }

  watch (pathSpec = null) {
    var errStack = (new Error()).stack
    try {
      return fromEventStream(this[API].watch(this.url, pathSpec))
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  createNetworkActivityStream () {
    var errStack = (new Error()).stack
    try {
      return fromEventStream(this[API].createNetworkActivityStream(this.url))
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

// add internal methods
if (window.location.protocol === 'beaker:') {
  DatArchive.importFromFilesystem = async function (opts = {}) {
    var errStack = (new Error()).stack
    try {
      return await dat.importFromFilesystem(opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  DatArchive.exportToFilesystem = async function (opts = {}) {
    var errStack = (new Error()).stack
    try {
      return await dat.exportToFilesystem(opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }

  DatArchive.exportToArchive = async function (opts = {}) {
    var errStack = (new Error()).stack
    try {
      return await dat.exportToArchive(opts)
    } catch (e) {
      throwWithFixedStack(e, errStack)
    }
  }
}

export default DatArchive


// internal methods
// =

function setHidden (t, attr, value) {
  Object.defineProperty(t, attr, {enumerable: false, value})
}

function isDatURL (url) {
  var urlp = parseDatURL(url)
  return urlp && urlp.protocol === 'dat:'
}

function throwWithFixedStack (e, errStack) {
  e = e || new Error()
  e.stack = e.stack.split('\n')[0] + '\n' + errStack.split('\n').slice(2).join('\n')
  throw e
}

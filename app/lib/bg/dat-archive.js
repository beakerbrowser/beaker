// this is a backend version of the DatArchive API
// it was originally created so that we can use ingestdb in the backend

import dat from '../../bg/web-apis/dat-archive'
import {fromAsyncEventStream} from '../web-apis/event-target'
import parseDatURL from 'parse-dat-url'

const URL_PROMISE = Symbol('URL_PROMISE')

// wrap the dat RPC in a replacement context
const context = {
  sender: { getURL: () => 'beaker://internal/' }
}
var datCtx = {}
for (var k in dat) {
  datCtx[k] = dat[k].bind(context)
}

export default class DatArchive {
  constructor (url) {
    // basic URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid dat:// URL')
    }

    // parse the URL
    const urlParsed = parseDatURL(url)
    if (!urlParsed || urlParsed.protocol !== 'dat:') {
      throw new Error('Invalid URL: must be a dat:// URL')
    }
    url = 'dat://' + urlParsed.hostname

    // load into the 'active' (in-memory) cache
    datCtx.loadArchive(url)

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
    return datCtx.createArchive(opts)
      .then(newUrl => new DatArchive(newUrl))
  }

  static fork (url, opts = {}) {
    url = (typeof url.url === 'string') ? url.url : url
    if (!isDatURL(url)) {
      throw new Error('Invalid URL: must be a dat:// URL')
    }
    return datCtx.forkArchive(url, opts)
      .then(newUrl => new DatArchive(newUrl))
  }

  static unlink (url) {
    url = (typeof url.url === 'string') ? url.url : url
    if (!isDatURL(url)) {
      throw new Error('Invalid URL: must be a dat:// URL')
    }
    return datCtx.unlinkArchive(url)
  }

  async getInfo (opts = {}) {
    var url = await this[URL_PROMISE]
    return datCtx.getInfo(url, opts)
  }

  async configure (info, opts = {}) {
    var url = await this[URL_PROMISE]
    return datCtx.configure(url, info, opts)
  }

  async history (opts = {}) {
    var url = await this[URL_PROMISE]
    return datCtx.history(url, opts)
  }

  async stat (path, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.stat(url, opts)
  }

  async readFile (path, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.readFile(url, opts)
  }

  async writeFile (path, data, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.writeFile(url, data, opts)
  }

  async unlink (path) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.unlink(url)
  }

  async download (path = '/', opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.download(url, opts)
  }

  async readdir (path = '/', opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.readdir(url, opts)
  }

  async mkdir (path) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.mkdir(url)
  }

  async rmdir (path, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return datCtx.rmdir(url, opts)
  }

  watch (pathSpec = null) {
    return fromAsyncEventStream(datCtx.watch(this.url, pathSpec))
  }

  createNetworkActivityStream () {
    return fromAsyncEventStream(datCtx.createNetworkActivityStream(this.url))
  }

  static async importFromFilesystem (opts = {}) {
    return datCtx.importFromFilesystem(opts)
  }

  static async exportToFilesystem (opts = {}) {
    return datCtx.exportToFilesystem(opts)
  }

  static async exportToArchive (opts = {}) {
    return datCtx.exportToArchive(opts)
  }

  static async resolveName (name) {
    return datCtx.resolveName(name)
  }

  static selectArchive (opts = {}) {
    return datCtx.selectArchive(opts)
      .then(url => new DatArchive(url))
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

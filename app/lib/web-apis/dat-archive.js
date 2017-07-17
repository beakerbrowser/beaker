/* globals URL */

import rpc from 'pauls-electron-rpc'
import errors from 'beaker-error-constants'
import datArchiveManifest from '../api-manifests/external/dat-archive'
import {EventTarget, fromEventStream} from './event-target'
import Stat from './stat'

const URL_PROMISE = Symbol()
const VERSION_REGEX = /^(dat:\/\/)?([^/]+)(\+[^/]+)(.*)$/i

// create the dat rpc api
const dat = rpc.importAPI('dat-archive', datArchiveManifest, { timeout: false, errors })

export default class DatArchive extends EventTarget {
  constructor (url) {
    super()

    // simple case: new DatArchive(window.location)
    if (url === window.location) {
      url = window.location.toString()
    }

    // basic URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid dat:// URL')
    }

    // parse the URL
    const urlParsed = new URL(url.startsWith('dat://') ? url : `dat://${url}`)
    if (urlParsed.protocol !== 'dat:') {
      throw new Error('Invalid URL: must be a dat:// URL')
    }
    // pull out the version specially
    const urlParsed2 = VERSION_REGEX.exec(urlParsed.hostname)
    url = 'dat://' + (urlParsed2 ? urlParsed2[2] : urlParsed.hostname)
    const urlVersion = urlParsed2 ? urlParsed2[3].slice(1) : false

    // load into the 'active' (in-memory) cache
    dat.loadArchive(url)

    // resolve the URL (DNS)
    const urlPromise = DatArchive.resolveName(url).then(url => {
      if (urlVersion) {
        url += `+${urlVersion}`
      }
      return url
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
    return dat.createArchive(opts)
      .then(newUrl => new DatArchive(newUrl))
  }

  static fork (url, opts = {}) {
    url = (typeof url.url === 'string') ? url.url : url
    return dat.forkArchive(url, opts)
      .then(newUrl => new DatArchive(newUrl))
  }

  async getInfo (opts = {}) {
    var url = await this[URL_PROMISE]
    return dat.getInfo(url, opts)
  }

  async diff (opts = {}) {
    var url = await this[URL_PROMISE]
    return dat.diff(url, opts)
  }

  async commit (opts = {}) {
    var url = await this[URL_PROMISE]
    return dat.commit(url, opts)
  }

  async revert (opts = {}) {
    var url = await this[URL_PROMISE]
    return dat.revert(url, opts)
  }

  async history (opts = {}) {
    var url = await this[URL_PROMISE]
    return dat.history(url, opts)
  }

  async stat (path, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return new Stat(await dat.stat(url, opts))
  }

  async readFile (path, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.readFile(url, opts)
  }

  async writeFile (path, data, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.writeFile(url, data, opts)
  }

  async unlink (path) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.unlink(url)
  }

  // TODO copy-disabled
  /*async copy(path, dstPath) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.copy(url, dstPath)
  } */

  // TODO rename-disabled
  /*async rename(path, dstPath) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.rename(url, dstPath)
  } */

  async download (path = '/', opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.download(url, opts)
  }

  async readdir (path = '/', opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    var names = await dat.readdir(url, opts)
    if (opts.stat) {
      names.forEach(name => { name.stat = new Stat(name.stat) })
    }
    return names
  }

  async mkdir (path) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.mkdir(url)
  }

  async rmdir (path, opts = {}) {
    var url = await this[URL_PROMISE]
    url = joinPath(url, path)
    return dat.rmdir(url, opts)
  }

  createFileActivityStream (pathSpec = null) {
    return fromEventStream(dat.createFileActivityStream(this.url, pathSpec))
  }

  createNetworkActivityStream () {
    return fromEventStream(dat.createNetworkActivityStream(this.url))
  }

  static importFromFilesystem (opts = {}) {
    return dat.importFromFilesystem(opts)
  }

  static exportToFilesystem (opts = {}) {
    return dat.exportToFilesystem(opts)
  }

  static exportToArchive (opts = {}) {
    return dat.exportToArchive(opts)
  }

  static resolveName (name) {
    // simple case: DatArchive.resolveName(window.location)
    if (name === window.location) {
      name = window.location.toString()
    }
    return dat.resolveName(name)
  }

  static selectArchive (opts = {}) {
    return dat.selectArchive(opts)
  }
}

function joinPath (url, path) {
  if (path.charAt(0) === '/') return url + path
  return url + '/' + path
}

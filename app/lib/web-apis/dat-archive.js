import {ipcRenderer} from 'electron'
import rpc from 'pauls-electron-rpc'
import datArchiveManifest from '../api-manifests/external/dat-archive'
import {DAT_URL_REGEX} from '../const'
import {EventTarget, fromEventStream} from './event-target'
import errors from 'beaker-error-constants'

// create the dat rpc api
const dat = rpc.importAPI('dat-archive', datArchiveManifest, { timeout: false, errors })

export default class DatArchive extends EventTarget {
  constructor(url) {
    super()

    // basic URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid dat:// URL')
    }

    // parse the URL
    var urlParsed = new URL(url.startsWith('dat://') ? url : `dat://${url}`)
    if (urlParsed.protocol !== 'dat:') {
      throw new Error('Invalid URL: must be a dat:// URL')
    }
    url = 'dat://' + urlParsed.hostname

    // load into the 'active' (in-memory) cache
    dat.loadArchive(url)

    // define this.url as a frozen getter
    Object.defineProperty(this, 'url', {
      enumerable: true,
      value: url
    })
  }

  static create (opts={}) {
    return dat.createArchive(opts)
      .then(newUrl => new DatArchive(newUrl))
  }

  static fork (url, opts={}) {
    url = (typeof url.url === 'string') ? url.url : url
    return dat.forkArchive(url, opts)
      .then(newUrl => new DatArchive(newUrl))
  }

  getInfo(opts={}) {
    return dat.getInfo(this.url, opts)
  }

  updateManifest(manifest) {
    return dat.updateManifest(this.url, manifest)
  }

  stat(path, opts={}) {
    const url = joinPath(this.url, path)
    return dat.stat(url, opts)
  }

  readFile(path, opts={}) {
    const url = joinPath(this.url, path)
    return dat.readFile(url, opts)
  }

  writeFile(path, data, opts={}) {
    const url = joinPath(this.url, path)
    return dat.writeFile(url, data, opts)
  }

  deleteFile(path) {
    const url = joinPath(this.url, path)
    return dat.deleteFile(url)
  }

  download(path='/', opts={}) {
    const url = joinPath(this.url, path)
    return dat.download(url, opts)
  }

  listFiles(path='/', opts) {
    const url = joinPath(this.url, path)
    return dat.listFiles(url, opts)
  }

  createDirectory(path) {
    const url = joinPath(this.url, path)
    return dat.createDirectory(url)
  }

  deleteDirectory(path) {
    const url = joinPath(this.url, path)
    return dat.deleteDirectory(url)
  }

  createFileActivityStream(pathSpec=null) {
    return fromEventStream(dat.createFileActivityStream(this.url, pathSpec))
  }

  createNetworkActivityStream(opts) {
    return fromEventStream(dat.createNetworkActivityStream(this.url))
  }

  static importFromFilesystem(opts={}) {
    return dat.importFromFilesystem(opts)
  }
  
  static exportToFilesystem(opts={}) {
    return dat.exportToFilesystem(opts)
  }
  
  static exportToArchive(opts={}) {
    return dat.exportToArchive(opts)
  }

  static resolveName(name) {
    return dat.resolveName(name)
  }
}

function joinPath (url, path) {
  if (path.charAt(0) === '/') return url + path
  return url + '/' + path
}

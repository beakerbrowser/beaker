import {ipcRenderer} from 'electron'
import rpc from 'pauls-electron-rpc'
import datManifest from '../../lib/api-manifests/external/dat'

// create the dat rpc api
const dat = rpc.importAPI('dat', datManifest, { timeout: false, noEval: true })

export default class DatArchive {
  constructor(opts=null) {
    let url
    if (typeof opts === 'string') {
      // verify existence and validity of url
      // ... and load into the 'active' (in-memory) cache
      url = opts
      dat.loadArchive(url)
    } else {
      // create new archive
      url = dat.createArchive(opts)
    }
    // define this.url as a frozen getter
    Object.defineProperty(this, 'url', {
      enumerable: true,
      value: url
    })
  }

  static fork (url, opts=null) {
    url = (typeof url.url === 'string') ? url.url : url
    return new DatArchive(dat.forkArchive(url, opts))
  }

  async getInfo(opts=null) {
    // TODO opts needed?
    return dat.getInfo(this.url)
  }

  async setInfo(info) {
    return dat.setInfo(this.url, info)
  }

  async stat(path, opts=null) {
    const url = makeUrl(this.url, path)
    return dat.stat(url, opts)
  }

  async readFile(path, opts=null) {
    const url = makeUrl(this.url, path)
    return dat.readFile(url, opts)
  }

  async writeFile(path, data, opts=null) {
    const url = makeUrl(this.url, path)
    return dat.writeFile(url, data, opts)
  }

  async deleteFile(path) {
    const url = makeUrl(this.url, path)
    return dat.deleteFile(url)
  }

  async download(path, opts) {
    const url = makeUrl(this.url, path)
    return dat.download(url, opts)
  }

  async listFiles(path, opts) {
    const url = makeUrl(this.url, path)
    return dat.listFiles(url, opts)
  }

  async createDirectory(path) {
    const url = makeUrl(this.url, path)
    return dat.createDirectory(url)
  }

  async deleteDirectory(path) {
    const url = makeUrl(this.url, path)
    return dat.deleteDirectory(url)
  }

  // createFileActivityStream(opts) {
  //   // TODO
  // }

  // createNetworkActivityStream(opts) {
  //   // TODO
  // }

  // static async importFromFilesystem(opts) {
  //   // TODO
  // }
  
  // static async exportToFilesystem(opts) {
  //   // TODO
  // }
  
  // static async exportToArchive(opts) {
  //   // TODO
  // }
}
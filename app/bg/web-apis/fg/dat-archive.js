import errors from 'beaker-error-constants'
import parseDatURL from 'parse-dat-url'
import datArchiveManifest from '../manifests/external/dat-archive'
import { EventTarget, Event, fromEventStream } from './event-target'
import Stat from './stat'

const LOAD_PROMISE = Symbol('LOAD_PROMISE')
const NETWORK_ACT_STREAM = Symbol() // eslint-disable-line

export const setup = function (rpc) {
  // create the rpc apis
  const datRPC = rpc.importAPI('dat-archive', datArchiveManifest, { timeout: false, errors })

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
      if (!urlParsed || (urlParsed.protocol !== 'dat:')) {
        throwWithFixedStack(new Error('Invalid URL: must be a dat:// URL'), errStack)
      }
      url = 'dat://' + urlParsed.hostname + (urlParsed.version ? `+${urlParsed.version}` : '')

      // define this.url as a frozen getter
      Object.defineProperty(this, 'url', {
        enumerable: true,
        value: url
      })

      // load into the 'active' (in-memory) cache
      setHidden(this, LOAD_PROMISE, datRPC.loadArchive(url))
    }

    static load (url) {
      var errStack = (new Error()).stack
      const a = new DatArchive(url)
      return a[LOAD_PROMISE]
        .then(() => a)
        .catch(e => throwWithFixedStack(e, errStack))
    }

    static create (opts = {}) {
      var errStack = (new Error()).stack
      return datRPC.createArchive(opts)
        .then(newUrl => new DatArchive(newUrl))
        .catch(e => throwWithFixedStack(e, errStack))
    }

    static fork (url, opts = {}) {
      var errStack = (new Error()).stack
      url = (typeof url.url === 'string') ? url.url : url
      if (!isDatURL(url)) {
        throwWithFixedStack(new Error('Invalid URL: must be a dat:// URL'), errStack)
      }
      return datRPC.forkArchive(url, opts)
        .then(newUrl => new DatArchive(newUrl))
        .catch(e => throwWithFixedStack(e, errStack))
    }

    // override to create the activity stream if needed
    addEventListener (type, callback) {
      if (type === 'network-changed' || type === 'download' || type === 'upload' || type === 'sync') {
        createNetworkActStream(this)
      }
      super.addEventListener(type, callback)
    }

    async getInfo (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.getInfo(this.url, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async configure (info, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.configure(this.url, info, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    checkout (version) {
      const urlParsed = parseDatURL(this.url)
      version = version ? `+${version}` : ''
      return new DatArchive(`dat://${urlParsed.hostname}${version}`)
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
        return await datRPC.history(this.url, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async stat (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return new Stat(await datRPC.stat(this.url, path, opts))
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async readFile (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.readFile(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async writeFile (path, data, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.writeFile(this.url, path, data, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async unlink (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.unlink(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async copy (path, dstPath, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return datRPC.copy(this.url, path, dstPath, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async rename (path, dstPath, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return datRPC.rename(this.url, path, dstPath, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async download (path = '/', opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.download(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async readdir (path = '/', opts = {}) {
      var errStack = (new Error()).stack
      try {
        var names = await datRPC.readdir(this.url, path, opts)
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
        return await datRPC.mkdir(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async rmdir (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.rmdir(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async symlink (target, linkname, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.symlink(this.url, target, linkname, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async mount (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.mount(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async unmount (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.unmount(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    createFileActivityStream (pathSpec = null) {
      console.warn('The DatArchive createFileActivityStream() API has been deprecated, use watch() instead.')
      return this.watch(pathSpec)
    }

    watch (pathSpec = null, onInvalidated = null) {
      var errStack = (new Error()).stack
      try {
        // usage: (onInvalidated)
        if (typeof pathSpec === 'function') {
          onInvalidated = pathSpec
          pathSpec = null
        }

        var evts = fromEventStream(datRPC.watch(this.url, pathSpec))
        if (onInvalidated) {
          evts.addEventListener('invalidated', onInvalidated)
        }
        return evts
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    createNetworkActivityStream () {
      console.warn('The DatArchive createNetworkActivityStream() API has been deprecated, use addEventListener() instead.')
      var errStack = (new Error()).stack
      try {
        return fromEventStream(datRPC.createNetworkActivityStream(this.url))
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
        return await datRPC.resolveName(name)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    static selectArchive (opts = {}) {
      var errStack = (new Error()).stack
      return datRPC.selectArchive(opts)
        .then(url => new DatArchive(url))
        .catch(e => throwWithFixedStack(e, errStack))
    }
  }

  // add internal methods
  if (window.location.protocol === 'beaker:') {
    DatArchive.importFromFilesystem = async function (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.importFromFilesystem(opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    DatArchive.exportToFilesystem = async function (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.exportToFilesystem(opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    DatArchive.exportToArchive = async function (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await datRPC.exportToArchive(opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    DatArchive.diff = async function (srcUrl, dstUrl, opts = {}) {
      if (srcUrl && typeof srcUrl.url === 'string') srcUrl = srcUrl.url
      if (dstUrl && typeof dstUrl.url === 'string') dstUrl = dstUrl.url
      var errStack = (new Error()).stack
      return datRPC.diff(srcUrl, dstUrl, opts)
        .catch(e => throwWithFixedStack(e, errStack))
    }

    DatArchive.merge = async function (srcUrl, dstUrl, opts = {}) {
      if (srcUrl && typeof srcUrl.url === 'string') srcUrl = srcUrl.url
      if (dstUrl && typeof dstUrl.url === 'string') dstUrl = dstUrl.url
      var errStack = (new Error()).stack
      return datRPC.merge(srcUrl, dstUrl, opts)
        .catch(e => throwWithFixedStack(e, errStack))
    }
  }

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

  function createNetworkActStream (archive) {
    if (archive[NETWORK_ACT_STREAM]) return
    var s = archive[NETWORK_ACT_STREAM] = fromEventStream(datRPC.createNetworkActivityStream(archive.url))
    s.addEventListener('network-changed', detail => archive.dispatchEvent(new Event('network-changed', {target: archive, peers: detail.connections})))
    s.addEventListener('download', detail => archive.dispatchEvent(new Event('download', {target: archive, feed: detail.feed, block: detail.block, bytes: detail.bytes})))
    s.addEventListener('upload', detail => archive.dispatchEvent(new Event('upload', {target: archive, feed: detail.feed, block: detail.block, bytes: detail.bytes})))
    s.addEventListener('sync', detail => archive.dispatchEvent(new Event('sync', {target: archive, feed: detail.feed})))
  }

  return DatArchive
}

import errors from 'beaker-error-constants'
import { parseDriveUrl } from '../../../lib/urls'
import hyperdriveManifest from '../manifests/external/hyperdrive'
import { EventTarget, Event, fromEventStream } from './event-target'
import Stat from './stat'

const LOAD_PROMISE = Symbol('LOAD_PROMISE')
const NETWORK_ACT_STREAM = Symbol() // eslint-disable-line

export const setup = function (rpc) {
  // create the rpc apis
  const hyperdriveRPC = rpc.importAPI('hyperdrive', hyperdriveManifest, { timeout: false, errors })

  class Hyperdrive extends EventTarget {
    constructor (url) {
      super()
      var errStack = (new Error()).stack

      // simple case: new Hyperdrive(window.location)
      if (url === window.location) {
        url = window.location.toString()
      }

      // basic URL validation
      if (!url || typeof url !== 'string') {
        throwWithFixedStack(new Error('Invalid hyper:// URL'), errStack)
      }

      // parse the URL
      const urlParsed = parseDriveUrl(url)
      if (!urlParsed || urlParsed.protocol !== 'hyper:') {
        throwWithFixedStack(new Error('Invalid URL: must be a hyper:// URL'), errStack)
      }
      url = 'hyper://' + urlParsed.hostname + (urlParsed.version ? `+${urlParsed.version}` : '')

      // define this.url as a frozen getter
      Object.defineProperty(this, 'url', {
        enumerable: true,
        value: url
      })
      Object.defineProperty(this, 'version', {
        enumerable: true,
        value: urlParsed.version
      })

      // load into the 'active' (in-memory) cache
      setHidden(this, LOAD_PROMISE, hyperdriveRPC.loadDrive(url))
    }

    static load (url) {
      var errStack = (new Error()).stack
      const a = new Hyperdrive(url)
      return a[LOAD_PROMISE]
        .then(() => a)
        .catch(e => throwWithFixedStack(e, errStack))
    }

    static create (opts = {}) {
      var errStack = (new Error()).stack
      return hyperdriveRPC.createDrive(opts)
        .then(newUrl => new Hyperdrive(newUrl))
        .catch(e => throwWithFixedStack(e, errStack))
    }

    static clone (url, opts = {}) {
      var errStack = (new Error()).stack
      url = (typeof url.url === 'string') ? url.url : url
      if (!isDriveUrl(url)) {
        throwWithFixedStack(new Error('Invalid URL: must be a hyper:// URL'), errStack)
      }
      return hyperdriveRPC.cloneDrive(url, opts)
        .then(newUrl => new Hyperdrive(newUrl))
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
        return await hyperdriveRPC.getInfo(this.url, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async configure (info, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.configure(this.url, info, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    checkout (version) {
      const urlParsed = parseDriveUrl(this.url)
      version = version ? `+${version}` : ''
      return new Hyperdrive(`hyper://${urlParsed.hostname}${version}`)
    }

    async diff (other, prefix, opts = {}) {
      var errStack = (new Error()).stack
      try {
        other = other && typeof other === 'object' && other.version ? other.version : other
        var res = await hyperdriveRPC.diff(this.url, other, prefix, opts)
        for (let change of res) {
          if (change.value.stat) {
            change.value.stat = new Stat(change.value.stat)
          }
        }
        return res
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async stat (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return new Stat(await hyperdriveRPC.stat(this.url, path, opts))
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async readFile (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.readFile(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async writeFile (path, data, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.writeFile(this.url, path, data, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async unlink (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.unlink(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async copy (path, dstPath, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return hyperdriveRPC.copy(this.url, path, dstPath, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async rename (path, dstPath, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return hyperdriveRPC.rename(this.url, path, dstPath, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async download (path = '/', opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.download(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async updateMetadata (path, metadata, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.updateMetadata(this.url, path, metadata, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async deleteMetadata (path, keys, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.deleteMetadata(this.url, path, keys, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async readdir (path = '/', opts = {}) {
      var errStack = (new Error()).stack
      try {
        var names = await hyperdriveRPC.readdir(this.url, path, opts)
        if (opts.includeStats) {
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
        return await hyperdriveRPC.mkdir(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async rmdir (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.rmdir(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async symlink (target, linkname, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.symlink(this.url, target, linkname, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async mount (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.mount(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async unmount (path, opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.unmount(this.url, path, opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    async query (opts) {
      var errStack = (new Error()).stack
      try {
        var res = await hyperdriveRPC.query(this.url, opts)
        res.forEach(item => {
          if (item.stat) item.stat = new Stat(item.stat)
        })
        return res
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    watch (pathSpec = null, onInvalidated = null) {
      var errStack = (new Error()).stack
      try {
        // usage: (onInvalidated)
        if (typeof pathSpec === 'function') {
          onInvalidated = pathSpec
          pathSpec = null
        }

        var evts = fromEventStream(hyperdriveRPC.watch(this.url, pathSpec))
        if (onInvalidated) {
          evts.addEventListener('invalidated', onInvalidated)
        }
        return evts
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    static async resolveName (name) {
      var errStack = (new Error()).stack
      try {
        // simple case: Hyperdrive.resolveName(window.location)
        if (name === window.location) {
          name = window.location.toString()
        }
        return await hyperdriveRPC.resolveName(name)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }
  }

  // add internal methods
  if (window.location.protocol === 'beaker:') {
    Hyperdrive.importFromFilesystem = async function (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.importFromFilesystem(opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    Hyperdrive.exportToFilesystem = async function (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.exportToFilesystem(opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    Hyperdrive.exportToDrive = async function (opts = {}) {
      var errStack = (new Error()).stack
      try {
        return await hyperdriveRPC.exportToDrive(opts)
      } catch (e) {
        throwWithFixedStack(e, errStack)
      }
    }

    Hyperdrive.diff = async function (srcUrl, dstUrl, opts = {}) {
      if (srcUrl && typeof srcUrl.url === 'string') srcUrl = srcUrl.url
      if (dstUrl && typeof dstUrl.url === 'string') dstUrl = dstUrl.url
      var errStack = (new Error()).stack
      return hyperdriveRPC.beakerDiff(srcUrl, dstUrl, opts)
        .catch(e => throwWithFixedStack(e, errStack))
    }

    Hyperdrive.merge = async function (srcUrl, dstUrl, opts = {}) {
      if (srcUrl && typeof srcUrl.url === 'string') srcUrl = srcUrl.url
      if (dstUrl && typeof dstUrl.url === 'string') dstUrl = dstUrl.url
      var errStack = (new Error()).stack
      return hyperdriveRPC.beakerMerge(srcUrl, dstUrl, opts)
        .catch(e => throwWithFixedStack(e, errStack))
    }
  }

  // internal methods
  // =

  function setHidden (t, attr, value) {
    Object.defineProperty(t, attr, {enumerable: false, value})
  }

  function isDriveUrl (url) {
    var urlp = parseDriveUrl(url)
    return urlp && (urlp.protocol === 'hyper:')
  }

  function throwWithFixedStack (e, errStack) {
    e = e || new Error()
    e.stack = e.stack.split('\n')[0] + '\n' + errStack.split('\n').slice(2).join('\n')
    throw e
  }

  function createNetworkActStream (drive) {
    if (drive[NETWORK_ACT_STREAM]) return
    var s = drive[NETWORK_ACT_STREAM] = fromEventStream(hyperdriveRPC.createNetworkActivityStream(drive.url))
    s.addEventListener('network-changed', detail => drive.dispatchEvent(new Event('network-changed', {target: drive, peers: detail.connections})))
    s.addEventListener('download', detail => drive.dispatchEvent(new Event('download', {target: drive, feed: detail.feed, block: detail.block, bytes: detail.bytes})))
    s.addEventListener('upload', detail => drive.dispatchEvent(new Event('upload', {target: drive, feed: detail.feed, block: detail.block, bytes: detail.bytes})))
    s.addEventListener('sync', detail => drive.dispatchEvent(new Event('sync', {target: drive, feed: detail.feed})))
  }

  return Hyperdrive
}

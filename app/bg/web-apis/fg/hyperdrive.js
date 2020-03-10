import errors from 'beaker-error-constants'
import { parseDriveUrl } from '../../../lib/urls'
import hyperdriveManifest from '../manifests/external/hyperdrive'
import filesystemManifest from '../manifests/internal/beaker-filesystem'
import { EventTarget, Event, fromEventStream } from './event-target'
import { createStat } from './stat'

const NETWORK_ACT_STREAM = Symbol() // eslint-disable-line

export function setup (rpc) {
  // create the rpc apis
  const hyperdriveRPC = rpc.importAPI('hyperdrive', hyperdriveManifest, { timeout: false, errors })

  function createHyperdrive (url) {
    if (typeof url !== 'string') {
      if (typeof url.url === 'string') {
        url = url.url
      } else if (typeof url.href === 'string') {
        url = url.href
      } else {
        throw new Error('Invalid hyper:// URL')
      }
    }

    // basic URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid hyper:// URL')
    }

    // parse the URL
    const urlParsed = parseDriveUrl(url)
    if (!urlParsed || urlParsed.protocol !== 'hyper:') {
      throw new Error('Invalid URL: must be a hyper:// URL')
    }
    url = 'hyper://' + urlParsed.hostname + (urlParsed.version ? `+${urlParsed.version}` : '')

    // instruct backend to load
    hyperdriveRPC.loadDrive(url)

    return {
      get url () { return url },
      get version () { return urlParsed.version },

      async getInfo (opts = {}) {
        return hyperdriveRPC.getInfo(url, opts)
      },

      async configure (info, opts = {}) {
        return hyperdriveRPC.configure(url, info, opts)
      },

      checkout (version) {
        version = version ? `+${version}` : ''
        return createHyperdrive(`hyper://${urlParsed.hostname}${version}`)
      },

      async diff (other, prefix, opts = {}) {
        other = other && typeof other === 'object' && other.version ? other.version : other
        var res = await hyperdriveRPC.diff(url, other, prefix, opts)
        for (let change of res) {
          if (change.value.stat) {
            change.value.stat = createStat(change.value.stat)
          }
        }
        return res
      },

      async stat (path, opts = {}) {
        return createStat(await hyperdriveRPC.stat(url, path, opts))
      },

      async readFile (path, opts = {}) {
        return hyperdriveRPC.readFile(url, path, opts)
      },

      async writeFile (path, data, opts = {}) {
        return hyperdriveRPC.writeFile(url, path, data, opts)
      },

      async unlink (path, opts = {}) {
        return hyperdriveRPC.unlink(url, path, opts)
      },

      async copy (path, dstPath, opts = {}) {
        return hyperdriveRPC.copy(url, path, dstPath, opts)
      },

      async rename (path, dstPath, opts = {}) {
        return hyperdriveRPC.rename(url, path, dstPath, opts)
      },

      async updateMetadata (path, metadata, opts = {}) {
        return hyperdriveRPC.updateMetadata(url, path, metadata, opts)
      },

      async deleteMetadata (path, keys, opts = {}) {
        return hyperdriveRPC.deleteMetadata(url, path, keys, opts)
      },

      async readdir (path = '/', opts = {}) {
        var names = await hyperdriveRPC.readdir(url, path, opts)
        if (opts.includeStats) {
          names.forEach(name => { name.stat = createStat(name.stat) })
        }
        return names
      },

      async mkdir (path, opts = {}) {
        return hyperdriveRPC.mkdir(url, path, opts)
      },

      async rmdir (path, opts = {}) {
        return hyperdriveRPC.rmdir(url, path, opts)
      },

      async symlink (target, linkname, opts = {}) {
        return hyperdriveRPC.symlink(url, target, linkname, opts)
      },

      async mount (path, opts = {}) {
        if (opts.url) opts = opts.url
        return hyperdriveRPC.mount(url, path, opts)
      },

      async unmount (path, opts = {}) {
        return hyperdriveRPC.unmount(url, path, opts)
      },

      async query (opts) {
        var res = await hyperdriveRPC.query(url, opts)
        res.forEach(item => {
          if (item.stat) item.stat = createStat(item.stat)
        })
        return res
      },

      watch (pathSpec = null, onChanged = null) {
        // usage: (onChanged)
        if (typeof pathSpec === 'function') {
          onChanged = pathSpec
          pathSpec = null
        }

        var evts = fromEventStream(hyperdriveRPC.watch(url, pathSpec))
        if (onChanged) {
          evts.addEventListener('changed', onChanged)
        }
        return evts
      }
    }
  }

  function isDriveUrl (url) {
    var urlp = parseDriveUrl(url)
    return urlp && (urlp.protocol === 'hyper:')
  }

  var api = {
    load (url) {
      return createHyperdrive(url)
    },

    get self () {
      if (window.location.toString().startsWith('hyper://')) {
        return createHyperdrive(window.location.toString())
      }
      return undefined
    },

    create (opts = {}) {
      return hyperdriveRPC.createDrive(opts)
        .then(newUrl => createHyperdrive(newUrl))
    },

    fork (url, opts = {}) {
      url = (typeof url.url === 'string') ? url.url : url
      if (!isDriveUrl(url)) {
        throw new Error('Invalid URL: must be a hyper:// URL')
      }
      return hyperdriveRPC.forkDrive(url, opts)
        .then(newUrl => createHyperdrive(newUrl))
    }
  }

  // add internal methods
  if (window.location.protocol === 'beaker:') {
    let filesystemApi = rpc.importAPI('beaker-filesystem', filesystemManifest, {timeout: false, errors})
    let fsUrl = undefined
    api.getSystemDrive = () => {
      if (!fsUrl) fsUrl = filesystemApi.get().url
      return createHyperdrive(fsUrl)
    }
    api.importFromFilesystem = async function (opts = {}) {
      return hyperdriveRPC.importFromFilesystem(opts)
    }
    api.exportToFilesystem = async function (opts = {}) {
      return hyperdriveRPC.exportToFilesystem(opts)
    }
    api.exportToDrive = async function (opts = {}) {
      return hyperdriveRPC.exportToDrive(opts)
    }
    api.diff = async function (srcUrl, dstUrl, opts = {}) {
      if (srcUrl && typeof srcUrl.url === 'string') srcUrl = srcUrl.url
      if (dstUrl && typeof dstUrl.url === 'string') dstUrl = dstUrl.url
      return hyperdriveRPC.beakerDiff(srcUrl, dstUrl, opts)
    }
    api.merge = async function (srcUrl, dstUrl, opts = {}) {
      if (srcUrl && typeof srcUrl.url === 'string') srcUrl = srcUrl.url
      if (dstUrl && typeof dstUrl.url === 'string') dstUrl = dstUrl.url
      return hyperdriveRPC.beakerMerge(srcUrl, dstUrl, opts)
    }
  }

  return api
}

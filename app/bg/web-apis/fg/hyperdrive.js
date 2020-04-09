import errors from 'beaker-error-constants'
import { parseDriveUrl } from '../../../lib/urls'
import hyperdriveManifest from '../manifests/external/hyperdrive'
import filesystemManifest from '../manifests/internal/beaker-filesystem'
import { EventTarget, Event, fromEventStream } from './event-target'
import { createStat } from './stat'

const isDriveUrlRe = /^(hyper:\/\/)?[^\/]+/i

export function setup (rpc) {
  // create the rpc apis
  const hyperdriveRPC = rpc.importAPI('hyperdrive', hyperdriveManifest, { timeout: false, errors })

  function massageUrl (url) {
    if (!url) url = '/'
    if (typeof url !== 'string') {
      if (typeof url.url === 'string') {
        // passed in another drive instance
        url = url.url
      } else if (typeof url.href === 'string') {
        // passed in window.location
        url = url.href
      } else {
        throw new Error('Invalid hyper:// URL')
      }
    }
    if (location.protocol === 'hyper:') {
      if (!isDriveUrlRe.test(url)) {
        url = joinPath('hyper://' + location.hostname, url)
      }
    } else if (!url.startsWith('hyper://')) {
      // didnt include the scheme
      url = 'hyper://' + url
    }
    if (!isDriveUrlRe.test(url)) {
      // whoops not a valid hyper:// url
      throw new Error('Invalid URL: must be a hyper:// URL')
    }
    return url
  }

  function joinPath (a = '', b = '') {
    ;[a, b] = [String(a), String(b)]
    var [aSlash, bSlash] = [a.endsWith('/'), b.startsWith('/')]
    if (!aSlash && !bSlash) return a + '/' + b
    if (aSlash && bSlash) return a + b.slice(1)
    return a + b
  }

  function isNotUrlish (v) {
    if (!v) return true
    if (typeof v === 'string') return false
    if (typeof v === 'object') {
      if (typeof v.url === 'string') return false
      if (typeof v.href === 'string') return false
    }
    return true
  }

  function createScopedAPI (url) {
    url = massageUrl(url)
    const urlParsed = parseDriveUrl(url)
    url = 'hyper://' + urlParsed.hostname + (urlParsed.version ? `+${urlParsed.version}` : '') + '/'

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
        return createScopedAPI(`hyper://${urlParsed.hostname}${version}/`)
      },

      async diff (prefix, other, opts = {}) {
        other = other && typeof other === 'object' && other.version ? other.version : other
        var res = await hyperdriveRPC.diff(joinPath(url, prefix), other, prefix, opts)
        for (let change of res) {
          if (change.value.stat) {
            change.value.stat = createStat(change.value.stat)
          }
        }
        return res
      },

      async stat (path, opts = {}) {
        return createStat(await hyperdriveRPC.stat(joinPath(url, path), opts))
      },

      async readFile (path, opts = {}) {
        return hyperdriveRPC.readFile(joinPath(url, path), opts)
      },

      async writeFile (path, data, opts = {}) {
        return hyperdriveRPC.writeFile(joinPath(url, path), data, opts)
      },

      async unlink (path, opts = {}) {
        return hyperdriveRPC.unlink(joinPath(url, path), opts)
      },

      async copy (path, dstPath, opts = {}) {
        return hyperdriveRPC.copy(joinPath(url, path), dstPath, opts)
      },

      async rename (path, dstPath, opts = {}) {
        return hyperdriveRPC.rename(joinPath(url, path), dstPath, opts)
      },

      async updateMetadata (path, metadata, opts = {}) {
        return hyperdriveRPC.updateMetadata(joinPath(url, path), metadata, opts)
      },

      async deleteMetadata (path, keys, opts = {}) {
        return hyperdriveRPC.deleteMetadata(joinPath(url, path), keys, opts)
      },

      async readdir (path = '/', opts = {}) {
        var names = await hyperdriveRPC.readdir(joinPath(url, path), opts)
        if (opts.includeStats) {
          names.forEach(name => { name.stat = createStat(name.stat) })
        }
        return names
      },

      async mkdir (path, opts = {}) {
        return hyperdriveRPC.mkdir(joinPath(url, path), opts)
      },

      async rmdir (path, opts = {}) {
        return hyperdriveRPC.rmdir(joinPath(url, path), opts)
      },

      async symlink (path, linkname, opts = {}) {
        return hyperdriveRPC.symlink(joinPath(url, path), linkname, opts)
      },

      async mount (path, opts = {}) {
        if (opts.url) opts = opts.url
        return hyperdriveRPC.mount(joinPath(url, path), opts)
      },

      async unmount (path, opts = {}) {
        return hyperdriveRPC.unmount(joinPath(url, path), opts)
      },

      async query (opts) {
        if (typeof opts === 'string') {
          opts = {path: [opts]}
        }
        opts.drive = [url]
        var res = await hyperdriveRPC.query(opts)
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

  var api = {
    drive (url) {
      return createScopedAPI(url)
    },

    createDrive (opts = {}) {
      return hyperdriveRPC.createDrive(opts)
        .then(newUrl => createScopedAPI(newUrl))
    },

    forkDrive (url, opts = {}) {
      url = massageUrl(url)
      const urlParsed = parseDriveUrl(url)
      return hyperdriveRPC.forkDrive(urlParsed.hostname, opts)
        .then(newUrl => createScopedAPI(newUrl))
    },

    async getInfo (url, opts) {
      if (isNotUrlish(url) && !opts) {
        opts = url
        url = ''
      }
      url = massageUrl(url)
      return hyperdriveRPC.getInfo(url, opts)
    },

    async configure (url, info, opts) {
      if (isNotUrlish(url) && !opts && !info) {
        info = url
        url = ''
      }
      url = massageUrl(url)
      return hyperdriveRPC.configure(url, info, opts)
    },

    checkout (url, version) {
      if (isNotUrlish(url) && !version) {
        version = url
        url = ''
      }
      url = massageUrl(url)
      const urlParsed = parseDriveUrl(url)
      version = version ? `+${version}` : ''
      return createScopedAPI(`hyper://${urlParsed.hostname}${version}/`)
    },

    async diff (url, other, opts = {}) {
      url = massageUrl(url)
      other = other && typeof other === 'object' && other.version ? other.version : other
      var res = await hyperdriveRPC.diff(url, other, opts)
      for (let change of res) {
        if (change.value.stat) {
          change.value.stat = createStat(change.value.stat)
        }
      }
      return res
    },

    async stat (url, opts = {}) {
      url = massageUrl(url)
      return createStat(await hyperdriveRPC.stat(url, opts))
    },

    async readFile (url, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.readFile(url, opts)
    },

    async writeFile (url, data, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.writeFile(url, data, opts)
    },

    async unlink (url, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.unlink(url, opts)
    },

    async copy (url, dstPath, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.copy(url, dstPath, opts)
    },

    async rename (url, dstPath, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.rename(url, dstPath, opts)
    },

    async updateMetadata (url, metadata, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.updateMetadata(url, metadata, opts)
    },

    async deleteMetadata (url, keys, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.deleteMetadata(url, keys, opts)
    },

    async readdir (url, opts = {}) {
      url = massageUrl(url)
      var names = await hyperdriveRPC.readdir(url, opts)
      if (opts.includeStats) {
        names.forEach(name => { name.stat = createStat(name.stat) })
      }
      return names
    },

    async mkdir (url, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.mkdir(url, opts)
    },

    async rmdir (url, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.rmdir(url, opts)
    },

    async symlink (url, linkname, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.symlink(url, linkname, opts)
    },

    async mount (url, opts = {}) {
      url = massageUrl(url)
      if (opts.url) opts = opts.url
      return hyperdriveRPC.mount(url, opts)
    },

    async unmount (url, opts = {}) {
      url = massageUrl(url)
      return hyperdriveRPC.unmount(url, opts)
    },

    async query (opts) {
      if (typeof opts === 'string') {
        opts = {path: [opts]}
      }
      if (!opts.drive && location.protocol === 'hyper:') {
        opts.drive = [location.hostname]
      }
      var res = await hyperdriveRPC.query(opts)
      res.forEach(item => {
        if (item.stat) item.stat = createStat(item.stat)
      })
      return res
    }
  }

  // add internal methods
  if (window.location.protocol === 'beaker:') {
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

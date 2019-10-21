import * as filesystem from './index'
import datDns from '../dat/dns'
import { join as joinPath } from 'path'

// typedefs
// =

/**
 * @typedef {Object} FSQueryOpts
 * @prop {string|string[]} path
 * @prop {string} [type]
 * @prop {string} [mount]
 * @prop {Object} [meta]
 * @prop {string} [sort] - 'name', 'ctime', 'mtime'
 * @prop {boolean} [reverse]
 * @prop {number} [limit]
 * @prop {number} [offset]
 * 
 * @typedef {Object} Stat
 * @prop {number} mode
 * @prop {number} size
 * @prop {number} offset
 * @prop {number} blocks
 * @prop {Date} atime
 * @prop {Date} mtime
 * @prop {Date} ctime
 * @prop {Object} [mount]
 * @prop {string} [mount.key]
 * @prop {string} linkname
 * 
 * @typedef {Object} DriveInfo
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 * @prop {string} type
 * @prop {Object} ident
 * @prop {boolean} ident.isRoot
 * @prop {boolean} ident.isUser
 * 
 * @typedef {Object} FSQueryResult
 * @prop {string} type
 * @prop {string} path
 * @prop {Stat} stat
 * @prop {DriveInfo} parentDrive
 * @prop {DriveInfo} [targetDrive]
 */

// exported api
// =

// navigator.filesystem.query({type: 'mount', path: ['/public', '/public/friends/*', '/public/friends/*/friends/*']})
// => [{type: 'mount', path: '/public', stat, targetDrive, parentDrive}, {type: 'mount', path: '/public/friend/bob', stat, targetDrive, parentDrive}, ...]

// navigator.filesystem.query({type: 'mount', mount: url, path: ['/public/friends/*', '/public/friends/*/friends/*']})
// => [{type: 'mount', path: '/public/friend/bob', stat, targetDrive, parentDrive}, ...]

// navigator.filesystem.query({type: 'file', meta: {href: url}, path: ['/public/comments', '/public/friends/*/comments', '/public/friends/*/friends/*/comments']})
// => [{type: 'folder', path: '/public/comment/foo.txt', stat, parentDrive}]

/**
 * @param {FSQueryOpts} opts
 * @returns {Promise<FSQueryResult[]>}
 */
export async function query (opts) {
  // validate opts
  if (!opts || !opts.path) throw new Error('The `path` parameter is required')
  if (!(typeof opts.path === 'string' || (Array.isArray(opts.path) && opts.path.every(v => typeof v === 'string')))) {
    throw new Error('The `path` parameter must be a string or array of strings')
  }
  if (opts.type && typeof opts.type !== 'string') {
    throw new Error('The `type` parameter must be a string')
  }
  if (opts.mount && typeof opts.mount !== 'string') {
    throw new Error('The `mount` parameter must be a string')
  }
  if (opts.meta && typeof opts.meta !== 'object') {
    throw new Error('The `meta` parameter must be an object')
  }

  // massage opts
  if (opts.mount) opts.mount = await datDns.resolveName(opts.mount)

  // iterate all matching paths and match against the query
  var results = []
  var root = filesystem.get()
  for await (let path of expandPaths(root, opts.path)) {
    let stat
    try {
      stat = await root.pda.stat(path)
    } catch (e) {
      // dne, skip
      continue
    }

    var type = 'file'
    if (stat.mount && stat.mount.key) type = 'mount'
    else if (stat.isDirectory()) type = 'directory'

    if (opts.type && type !== opts.type) continue
    if (opts.mount && (type !== 'mount' || stat.mount.key.toString('hex') !== opts.mount)) continue
    // meta TODO

    results.push({
      type,
      path,
      stat,
      parentDrive: undefined, // TODO
      targetDrive: undefined // TODO
    })
  }

  if (opts.sort === 'name') {
    results.sort((a, b) => (opts.reverse) ? b.path.localeCompare(a.path) : a.path.localeCompare(b.path))
  } else if (opts.sort === 'mtime') {
    results.sort((a, b) => (opts.reverse) ? b.stat.mtime - a.stat.mtime : a.stat.mtime - b.stat.mtime)
  } else if (opts.sort === 'ctime') {
    results.sort((a, b) => (opts.reverse) ? b.stat.ctime - a.stat.ctime : a.stat.ctime - b.stat.ctime)
  }

  if (opts.offset && opts.limit) results = results.slice(opts.offset, opts.offset + opts.limit)
  else if (opts.offset) results = results.slice(opts.offset)
  else if (opts.limit) results = results.slice(0, opts.limit)

  return results
}

// internal
// =


async function* expandPaths (root, patterns) {
  patterns = Array.isArray(patterns) ? patterns : [patterns]

  for (let pattern of patterns) {
    // parse the pattern into a set of ops
    let acc = []
    let ops = []
    for (let part of pattern.split('/')) {
      if (part.includes('*')) {
        ops.push(['push', acc.filter(Boolean).join('/')])
        ops.push(['match', part])
        acc = []
      } else {
        acc.push(part)
      }
    }
    if (acc.length) ops.push(['push', acc.join('/')])

    // run the ops to assemble a list of matching paths
    var workingPaths = ['/']
    for (let op of ops) {
      let newWorkingPaths = []
      if (op[0] === 'push') {
        // add the given segment to all working paths
        newWorkingPaths = workingPaths.map(v => joinPath(v, op[1]))
      } else if (op[0] === 'match') {
        // compile a glob-matching regex from the segment
        var re = new RegExp(`^${op[1].replace(/\*/g, '[^/]*')}$`, 'i')
        
        // read the files at each working path
        for (let workingPath of workingPaths) {
          for (let name of await root.pda.readdir(workingPath).catch(e => [])) {
            // add matching names to the working path
            if (re.test(name)) {
              newWorkingPaths.push(joinPath(workingPath, name))
            }
          }
        }
      }
      workingPaths = newWorkingPaths
    }
    
    // emit the results
    for (let result of workingPaths) {
      yield result
    }
  }
}

// TODO!!
// put these tests somewhere!!
// const _get = require('lodash.get')
// const _isEqual = require('lodash.isequal')
// const assert = require('assert')
// const toArray = require('async-iterator-to-array')

// const RootMockPaths = {
//   foo: {
//     bar: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     },
//     bar2: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     },
//     bar3: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     }
//   },
//   foo2: {
//     bar: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     },
//     bar2: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     },
//     bar3: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     }
//   },
//   foo3: {
//     bar: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     },
//     bar2: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     },
//     bar3: {
//       baz: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz2: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       },
//       baz3: {
//         biz: {},
//         biz2: {},
//         biz3: {}
//       }
//     }
//   }
// }

// const RootMock = {
//   async readdir (path) {
//     path = path.replace(/\./g, '')
//     path = path.split('/').filter(Boolean).join('.')
//     if (!path) return Object.keys(RootMockPaths)
//     return Object.keys(_get(RootMockPaths, path) || {})
//   }
// }

// async function test () {
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/'])), ['/']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/foo'])), ['/foo']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/*'])), ['/foo', '/foo2', '/foo3']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/*oo'])), ['/foo']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/*oo*'])), ['/foo', '/foo2', '/foo3']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/*/bar'])), ['/foo/bar', '/foo2/bar', '/foo3/bar']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/f*/bar'])), ['/foo/bar', '/foo2/bar', '/foo3/bar']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/foo/*'])), ['/foo/bar', '/foo/bar2', '/foo/bar3']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/*oo/*'])), ['/foo/bar', '/foo/bar2', '/foo/bar3']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/foo/*/baz'])), ['/foo/bar/baz', '/foo/bar2/baz', '/foo/bar3/baz']))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/foo/*/baz/*'])), [
//     '/foo/bar/baz/biz',
//     '/foo/bar/baz/biz2',
//     '/foo/bar/baz/biz3',
//     '/foo/bar2/baz/biz',
//     '/foo/bar2/baz/biz2',
//     '/foo/bar2/baz/biz3',
//     '/foo/bar3/baz/biz',
//     '/foo/bar3/baz/biz2',
//     '/foo/bar3/baz/biz3'
//   ]))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/foo/*/*/biz'])), [
//     '/foo/bar/baz/biz',
//     '/foo/bar/baz2/biz',
//     '/foo/bar/baz3/biz',
//     '/foo/bar2/baz/biz',
//     '/foo/bar2/baz2/biz',
//     '/foo/bar2/baz3/biz',
//     '/foo/bar3/baz/biz',
//     '/foo/bar3/baz2/biz',
//     '/foo/bar3/baz3/biz'
//   ]))
//   assert(_isEqual(await toArray(expandPaths(RootMock, ['/', '/foo', '/*/bar'])), ['/', '/foo', '/foo/bar', '/foo2/bar', '/foo3/bar']))
//   console.log('done')
// }

// test()

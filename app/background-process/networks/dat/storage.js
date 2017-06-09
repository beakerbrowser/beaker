var path = require('path')
var fs = require('fs')
var raf = require('random-access-file')
var multi = require('multi-random-access')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var messages = require('append-tree/messages')
var stat = require('hyperdrive/lib/messages').Stat

/**
 this is the internal storage policy for dats that's used in beaker
 it's basically similar to hyperdrive's default
 except:
   1) content is stored as individual files, with the version # appended
   2) if a `latestDir` is provided, the latest version is hardlinked to it
**/

export default function (metadataDir, latestDir) {
  return {
    metadata: function (name, opts) {
      return raf(path.join(metadataDir, 'metadata', name))
    },
    content: function (name, opts, archive) {
      if (!archive) archive = opts
      if (name === 'data') return createStorage(archive, metadataDir, latestDir)
      return raf(path.join(metadataDir, 'content', name))
    }
  }
}

function createStorage (archive, metadataDir, latestDir) {
  return multi({limit: 128}, locate)

  function locate (offset, cb) {
    archive.ready(function (err) {
      if (err) return cb(err)

      find(archive.metadata, offset, function (err, node, st, index) {
        if (err) return cb(err)
        if (!node) return cb(new Error('Could not locate data'))

        // provide the storage
        var historicFilePath = path.join(metadataDir, 'content', 'files', `${node.name}.${st.offset}`)
        cb(null, {
          start: st.byteOffset,
          end: st.byteOffset + st.size,
          storage: raf(historicFilePath)
        })

        // create hardlink if needed
        if (!latestDir) {
          return
        }

        // is this most recent update the latest?
        archive.stat(node.name, function (err, latestSt) {
          if (err) {
            return console.error('Error getting stat of', node.name, err)
          }
          if (st.offset < latestSt.offset) {
            return // no
          }

          // yes, update hardlink
          var latestFilePath = path.join(latestDir, node.name)
          rimraf(latestFilePath, {disableGlob: true}, function (err) {
            if (err) return console.error('Error when removing previous in latest', err)
            mkdirp(path.dirname(latestFilePath), function (err) {
              if (err) return console.error('Error when creating dir in latest', err)
              fs.link(historicFilePath, latestFilePath, function (err) {
                if (err) console.error('Error when hardlinking file', err)
              })
            })
          })
        })
      })
    })
  }
}

function get (metadata, btm, seq, cb) {
  if (seq < btm) return cb(null, -1, null)

  // TODO: this can be done a lot faster using the hypercore internal iterators, expose!
  var i = seq
  while (!metadata.has(i) && i > btm) i--
  if (!metadata.has(i)) return cb(null, -1, null)

  metadata.get(i, {valueEncoding: messages.Node}, function (err, node) {
    if (err) return cb(err)

    var st = node.value && stat.decode(node.value)

    if (!node.value || (!st.offset && !st.blocks) || (!st.byteOffset && !st.blocks)) {
      return get(metadata, btm, i - 1, cb) // TODO: check the index instead for fast lookup
    }

    cb(null, i, node, st)
  })
}

function find (metadata, bytes, cb) {
  var top = metadata.length - 1
  var btm = 1
  var mid = Math.floor((top + btm) / 2)

  get(metadata, btm, mid, function loop (err, actual, node, st) {
    if (err) return cb(err)

    var oldMid = mid

    if (!node) {
      btm = mid
      mid = Math.floor((top + btm) / 2)
    } else {
      var start = st.byteOffset
      var end = st.byteOffset + st.size

      if (start <= bytes && bytes < end) return cb(null, node, st, actual)
      if (top <= btm) return cb(null, null, null, -1)

      if (bytes < start) {
        top = mid
        mid = Math.floor((top + btm) / 2)
      } else {
        btm = mid
        mid = Math.floor((top + btm) / 2)
      }
    }

    if (mid === oldMid) {
      if (btm < top) mid++
      else return cb(null, null, null, -1)
    }

    get(metadata, btm, mid, loop)
  })
}
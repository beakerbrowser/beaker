/**
 * tail-file.js: TODO: add file header description.
 *
 * (C) 2010 Charlie Robbins
 * (C) 2019 Paul Frazee
 * MIT LICENCE
 */

'use strict'

import fs from 'fs'
import { StringDecoder } from 'string_decoder'
import { Stream } from 'readable-stream'

/**
 * Simple no-op function.
 * @returns {undefined}
 */
function noop () {}

/**
 * Read and then tail the given file.
 * The algorithm is fairly straight-forward: after hitting the end, it will attempt reads once a second.
 * (It's poll-based rather than watch-based.)
 * @param {string} file - Path to file.
 * @returns {any} - TODO: add return description.
 */
export default (file) => {
  const buffer = Buffer.alloc(64 * 1024)
  const decode = new StringDecoder('utf8')
  const stream = new Stream()
  let pos = 0

  stream.readable = true
  stream.destroy = () => {
    stream.destroyed = true
    stream.emit('end')
    stream.emit('close')
  }

  fs.open(file, 'a+', '0644', async (err, fd) => {
    if (err) {
      stream.emit('error', err)
      stream.destroy()
      return
    }

    while (true) {
      if (stream.destroyed) {
        // abort if stream destroyed
        fs.close(fd, noop)
        return
      }

      // read next chunk
      let bytes
      try {
        bytes = await new Promise((resolve, reject) => {
          fs.read(fd, buffer, 0, buffer.length, pos, (err, bytes) => {
            if (err) reject(err)
            else resolve(bytes)
          })
        })
      } catch (err) {
        stream.emit('error', err)
        stream.destroy()
        return
      }

      if (!bytes) {
        // nothing read
        // wait a second, then try to read again
        await new Promise(resolve => setTimeout(resolve, 1e3))
        continue
      }

      // decode and emit
      let data = decode.write(buffer.slice(0, bytes))
      stream.emit('data', data)
      pos += bytes
    }
  })

  return stream
}

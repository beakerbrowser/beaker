import { Transform, Writable } from 'stream'

export class NoopWritable extends Writable {
  constructor(opts) {
    super(opts)
  }
  _write (chunk, encoding, cb) { 
    cb() // just discard
  }
}

export function transform (fn) {
  return new Transform({
    objectMode: true,
    transform (chunk, encoding, cb) {
      fn(chunk, cb)
    }
  })
}

export function noopWritable () {
  return new NoopWritable({ objectMode: true })
}
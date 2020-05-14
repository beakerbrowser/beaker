// http://man7.org/linux/man-pages/man2/stat.2.html
// mirrored from hyperdrive/lib/stat.js

function toHex (buf) {
  return buf.reduce((memo, i) => (
    memo + ('0' + i.toString(16)).slice(-2) // pad with leading 0 if <16
  ), '')
}

const IFSOCK = 49152 // 0b1100...
const IFLNK = 40960 // 0b1010...
const IFREG = 32768 // 0b1000...
const IFBLK = 24576 // 0b0110...
const IFDIR = 16384 // 0b0100...
const IFCHR = 8192 // 0b0010...
const IFIFO = 4096 // 0b0001...

export function createStat (data) {
  /*
  TODO- are the following attrs needed?
  this.dev = 0
  this.nlink = 1
  this.rdev = 0
  this.blksize = 0
  this.ino = 0
  this.uid = data ? data.uid : 0
  this.gid = data ? data.gid : 0 */

  var mode = data ? data.mode : 0
  return {
    mode,
    size: data ? data.size : 0,
    offset: data ? data.offset : 0,
    blocks: data ? data.blocks : 0,
    downloaded: data ? data.downloaded : 0,
    atime: new Date(data ? data.mtime : 0), // we just set this to mtime ...
    mtime: new Date(data ? data.mtime : 0),
    ctime: new Date(data ? data.ctime : 0),
    mount: data && data.mount && data.mount.key ? {key: toHex(data.mount.key)} : null,
    linkname: data ? data.linkname : null,
    metadata: data ? data.metadata : {},

    isSocket: check(mode, IFSOCK),
    isSymbolicLink: check(mode, IFLNK),
    isFile: check(mode, IFREG),
    isBlockDevice: check(mode, IFBLK),
    isDirectory: check(mode, IFDIR),
    isCharacterDevice: check(mode, IFCHR),
    isFIFO: check(mode, IFIFO)
  }
}

function check (mode, mask) {
  return function () {
    return (mask & mode) === mask
  }
}
import ScopedFS from 'scoped-fs'

// globals
// =

var scopedFSes = {} // map of scoped filesystems, kept in memory to reduce allocations

// exported APIs
// =

export function get (path) {
  if (!(path in scopedFSes)) {
    scopedFSes[path] = new ScopedFS(path)
  }
  return scopedFSes[path]
}

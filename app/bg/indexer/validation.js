import { normalizeOrigin } from '../../lib/urls'
import { parseUrl } from './util'

export function object (name, v) {
  if (!v) return
  if (!(typeof v === 'object')) {
    throw new Error(`${name} must be an object`)
  }
  return v
}

export function arrayOfStrings (name, v) {
  if (!v) return
  if (!(v && Array.isArray(v) && v.every(item => typeof item === 'string'))) {
    throw new Error(`${name} must be an array of strings`)
  }
  return v
}

export function arrayOfOrigins (name, v) {
  if (!v) return
  if (!(v && Array.isArray(v) && v.every(item => typeof item === 'string'))) {
    throw new Error(`${name} must be an array of origin strings`)
  }
  return v.map(normalizeOrigin)
}

export function string (name, v) {
  if (!v) return
  if (!(typeof v === 'string')) {
    throw new Error(`${name} must be a string`)
  }
  return v
}

export function origin (name, v) {
  if (!v) return
  if (!(typeof v === 'string')) {
    throw new Error(`${name} must be a string`)
  }
  return normalizeOrigin(v)
}

export function number (name, v) {
  if (!v) return
  if (!(typeof v === 'number')) {
    throw new Error(`${name} must be a number`)
  }
  return v
}

export function boolean (name, v) {
  if (!v) return
  if (!(typeof v === 'boolean')) {
    throw new Error(`${name} must be a boolean`)
  }
  return v
}

const VALID_SORTS = ['ctime', 'mtime', 'rtime', 'crtime', 'mrtime', 'origin']
export function sort (name, v) {
  if (!v) return
  v = string(name, v)
  if (!VALID_SORTS.includes(v)) {
    throw new Error(`${name} must be one of ${VALID_SORTS.join(', ')}`)
  }
  return v
}

export function rangeQuery (name, v) {
  if (!v) return
  v = object(name, v)
  if (!v.key) throw new Error(`${name}.key must be a string`)
  v.key = string(`${name}.key`, v.key)
  if (!v.value) throw new Error(`${name}.value must be a number`)
  v.value = number(`${name}.value`, v.value)
  v.inclusive = boolean(`${name}.inclusive`, v.inclusive)
  return v
}

export function metadataQuery (name, v) {
  if (!v) return
  if (!Array.isArray(v)) throw new Error(`${name} must be an array`)
  for (let item of v) {
    item = object(name, item)
    item.key = string(`${name}[].key`, item.key)
    item.values = arrayOfStrings(`${name}[].values`, item.values)
  }
  return v
}

export function linkQuery (name, v) {
  if (!v) return
  v = object(name, v)
  if (v.url) {
    v.url = string(`${name}.url`, v.url)
    let urlp = parseUrl(v.url)
    v.origin = urlp.origin
    v.paths = [urlp.path]
  } else {
    v.origin = origin(`${name}.origin`, v.origin)
    v.paths = arrayOfStrings(`${name}.paths`, v.paths)
  }
  return v
}

export function backlinkQuery (name, v) {
  if (!v) return
  v = object(name, v)
  v.metadata = metadataQuery(`${name}.metadata`, v.metadata)
  v.paths = arrayOfStrings(`${name}.paths`, v.paths)
  return v
}
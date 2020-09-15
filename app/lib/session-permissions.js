import { dirname, extname } from 'path'
import { isSameOrigin } from './urls'
import { parseSimplePathSpec } from './strings'

const VALID_ACCESS = ['read', 'write']

/**
 * @typedef {Object} EnumeratedSessionPerm
 * @prop {String} prefix
 * @prop {String} extension
 * @prop {String} location
 * @prop {String} recordType
 * @prop {String} access
 */

export function validateAndNormalizePermissions (permissions) {
  if (typeof permissions !== 'object') throw new Error(`Permissions must be an object`)
  for (let key in permissions) {
    if (key === 'publicFiles' || key === 'privateFiles') {
      if (!Array.isArray(permissions[key])) throw new Error(`Permission '${key}' should be an array`)
      for (let v of permissions[key]) {
        if (!v.path || typeof v.path !== 'string') throw new Error(`'${key}' permissions must have a .path string`)
        Object.assign(v, parseSimplePathSpec(v.path))
        delete v.path

        v.access = v.access || 'read'
        if (!VALID_ACCESS.includes(v.access)) throw new Error(`'${key}' permissions .access must be one of: ${VALID_ACCESS.join(', ')}`)

        if (!v.prefix.startsWith('/')) v.prefix = `/${v.prefix}`
        while (v.prefix.endsWith('/')) v.prefix = v.prefix.slice(0, -1)
        if (!v.prefix || v.prefix === '/') throw new Error(`'${key}' permissions .path can not be '/'`)
        if (!v.extension) throw new Error(`'${key}' permissions .path must include an extension`)
      }
    } else {
      throw new Error(`Invalid permission key: ${key}`)
    }
  }
}

/**
 * @param {Object} permissions 
 * @returns {EnumeratedSessionPerm[]}
 */
export function enumeratePerms (permissions) {
  var perms = []
  for (let k in permissions) {
    let arr = permissions[k]
    if (k === 'publicFiles' || k === 'privateFiles') {
      for (let v of arr) {
        if (k === 'publicFiles' && v.access === 'read') {
          continue // publicFiles have an implied read-all, don't render
        }
        let location = k === 'publicFiles' ? 'public' : 'private'
        let recordType = getRecordType(v)
        if (recordType === 'unknown') {
          recordType = `${v.extension} files in ${v.prefix}`
        }
        perms.push({access: v.access, location, recordType, prefix: v.prefix, extension: v.extension})
      }
    }
  }
  return perms
}

/**
 * @param {String} access
 * @param {Object} session 
 * @param {Object} session.permissions
 * @param {Object} session.userUrl
 * @param {String} driveUrl
 * @param {String} filepath
 * @returns {Boolean}
 */
export function sessionCan (access, session, driveUrl, filepath) {
  var key
  if (isSameOrigin(driveUrl, 'hyper://private')) {
    key = 'privateFiles'
  } else if (isSameOrigin(driveUrl, session.userUrl)) {
    key = 'publicFiles'
  } else {
    return false
  }
  
  var perm 
  var extension = extname(filepath)
  if (extension) {
    // individual file
    let prefix = dirname(filepath)
    perm = session.permissions[key]?.find(p => p.prefix === prefix && p.extension === extension)
  } else {
    // folder
    let prefix = filepath
    while (prefix.endsWith('/')) prefix = prefix.slice(0, -1)
    if (!prefix) return false
    perm = session.permissions[key]?.find(p => p.prefix === prefix)
  }

  if (perm) {
    if (access === 'read' || (access === 'write' && perm.access === 'write')) {
      return true
    }
  }
  return false
}

export function getRecordType ({prefix, extension}) {
  if (extension === '.goto') {
    if (prefix === '/bookmarks') return 'bookmarks'
    if (prefix === '/subscriptions') return 'subscriptions'
    if (prefix === '/votes') return 'votes'
  } else if (extension === '.md') {
    if (prefix === '/blog') return 'blogposts'
    if (prefix === '/comments') return 'comments'
    if (prefix === '/microblog') return 'microblogposts'
    if (prefix === '/pages') return 'pages'
  }
  return 'unknown'
}
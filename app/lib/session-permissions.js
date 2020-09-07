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
        if (!v.prefix || typeof v.prefix !== 'string') throw new Error(`'${key}' permissions must have a .prefix string`)
        if (!v.extension || typeof v.extension !== 'string') throw new Error(`'${key}' permissions must have a .extension string`)
        v.access = v.access || 'read'
        if (!VALID_ACCESS.includes(v.access)) throw new Error(`'${key}' permissions .access must be one of: ${VALID_ACCESS.join(', ')}`)
        if (!v.prefix.startsWith('/')) v.prefix = `/${v.prefix}`
        while (v.prefix.endsWith('/')) v.prefix = v.prefix.slice(0, -1)
        if (!v.prefix || v.prefix === '/') throw new Error(`'${key}' permissions .prefix can not be '/'`)
        if (!v.extension.startsWith('.')) v.extension = `.${v.extension}`
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
        perms.push({access: v.access, location, recordType, prefix: v.prefix, extension: v.extension})
      }
    }
  }
  return perms
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
  return `${extension} files in ${prefix}`
}
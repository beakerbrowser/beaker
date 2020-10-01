// constants
// =

export const TICK_INTERVAL = 15e3
export const READ_TIMEOUT = 5e3
export const READ_DIFF_TIMEOUT = 30e3
export const METADATA_KEYS = {
  content: '_content',
  href: 'href',
  parent: 'comment/parent',
  subject: 'comment/subject',
  title: 'title'
}

// typedefs
// =

/**
 * @typedef {Object} Site
 * @prop {String} origin
 * @prop {Number} rowid
 * @prop {Number} current_version
 * @prop {Number} last_indexed_version
 * @prop {Number} last_indexed_ts
 * @prop {Boolean} is_index_target - indicataes this site is actively being indexed, eg because subbed
 * @prop {Boolean} is_indexed - indicates this site's index is now ready to be used
 * @prop {String} title
 * @prop {String} description
 * @prop {Boolean} writable
 * @prop {function(String): Promise<Object>} stat
 * @prop {function(String): Promise<String>} fetch
 * @prop {function(): Promise<RecordUpdate[]>} listUpdates
 * @prop {function(String|String[]): Promise<Object>} listMatchingFiles
 * 
 * @typedef {Object} SiteDescription
 * @prop {String} origin
 * @prop {String} url
 * @prop {String} title
 * @prop {String} description
 * @prop {Boolean} writable
 * @prop {String} index
 *   
 * @typedef {Object} ParsedUrl
 * @prop {String} origin
 * @prop {String} path
 * @prop {String} pathname
 * 
 * @typedef {Object} RangeQuery
 * @prop {String} key
 * @prop {Number} value
 * @prop {Boolean} inclusive
 * 
 * @typedef {Object} LinkQuery
 * @prop {String} url
 * @prop {String} origin
 * @prop {String[]} paths
 * 
 * @typedef {Object} RecordUpdate
 * @prop {Boolean} remove
 * @prop {String} path
 * @prop {Object} metadata
 * @prop {Date} ctime
 * @prop {Date} mtime
 * 
 * @typedef {Object} RecordDescription
 * @prop {String} type
 * @prop {String} path
 * @prop {String} url
 * @prop {Number} ctime
 * @prop {Number} mtime
 * @prop {Number} rtime
 * @prop {Object} metadata
 * @prop {String} index
 * @prop {String[]} links
 * @prop {Object[]} [matches]
 * @prop {String} [content]
 * 
 * @typedef {Object} HyperbeeBacklink
 * @prop {String} key
 * @prop {Object} value
 * @prop {String} value.drive
 * @prop {String} value.source
 * @prop {Object} value.metadata
 * @prop {Number} value.rtime
 * @prop {Number} value.crtime
 * @prop {Number} value.mrtime
 * @prop {String} value.content
 */
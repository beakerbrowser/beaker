// constants
// =

export const TICK_INTERVAL = 15e3
export const READ_TIMEOUT = 5e3
export const METADATA_KEYS = {
  content: '_content',
  link: '_link',
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
 *  
 * @typedef {Object} ParsedUrl
 * @prop {String} origin
 * @prop {String} path
 * @prop {String} pathname
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
 * @prop {Object} metadata
 * @prop {Object} site
 * @prop {String} site.url
 * @prop {String} site.title
 * @prop {Object} index
 * @prop {String} index.id
 * @prop {Number} index.rtime
 * @prop {String[]} index.links
 * @prop {Object[]} [index.matches]
 * @prop {String} [content]
 * @prop {Object} [notification]
 * @prop {String} [notification.key]
 * @prop {String} [notification.subject]
 * @prop {Boolean} [notification.unread]
 * 
 * @typedef {Object} NotificationQuery
 * @prop {String} subject
 * @prop {Boolean} unread
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
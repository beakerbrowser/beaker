// constants
// =

export const TICK_INTERVAL = 15e3
export const READ_TIMEOUT = 15e3
export const FILE_TYPES = {
  blogpost: 'beaker/blogpost',
  bookmark: 'beaker/bookmark',
  comment: 'beaker/comment',
  microblogpost: 'beaker/microblogpost',
  page: 'beaker/page',
  subscription: 'beaker/subscription'
}
export const INDEX_IDS = {
  blogposts: 'beaker/index/blogposts',
  bookmarks: 'beaker/index/bookmarks',
  comments: 'beaker/index/comments',
  microblogposts: 'beaker/index/microblogposts',
  pages: 'beaker/index/pages',
  subscriptions: 'beaker/index/subscriptions'
}
export const METADATA_KEYS = {
  content: 'content',
  link: 'link',
  draft: 'beaker/draft',
  href: 'href',
  parent: 'beaker/parent',
  pinned: 'beaker/pinned',
  subject: 'beaker/subject',
  title: 'title'
}
export const NOTIFICATION_TYPES = {
  bookmark: 'beaker/notification/bookmark',
  comment: 'beaker/notification/comment',
  mention: 'beaker/notification/mention',
  reply: 'beaker/notification/reply',
  subscribe: 'beaker/notification/subscribe'
}

// typedefs
// =

/**
 * @typedef {Object} SubscribedSite
 * @prop {String} origin
 * @prop {Number} rowid
 * @prop {Object<String, IndexerState>} indexes
 * @prop {Number} current_version
 * @prop {String} title
 * @prop {function(String): Promise<String>} fetch
 * @prop {function(String): Promise<ResourceUpdate[]>} listUpdates
 * 
 * @typedef {Object} IndexerState
 * @prop {String} index
 * @prop {Number} last_indexed_version
 * 
 * @typedef {Object} ParsedUrl
 * @prop {String} origin
 * @prop {String} path
 * 
 * @typedef {Object} ResourceUpdate
 * @prop {Boolean} remove
 * @prop {String} path
 * @prop {Object} metadata
 * @prop {Date} ctime
 * @prop {Date} mtime
 * 
 * @typedef {Object} IndexerDefinition
 * @prop {String} id
 * @prop {String} title
 * @prop {function(ResourceUpdate): Boolean} filter
 * @prop {function(SubscribedSite, ResourceUpdate): Promise<any[][]>} getData
 * @prop {string[][]} notifications
 * 
 * @typedef {Object} ResourceDescription
 * @prop {String} url
 * @prop {String} index
 * @prop {Number} ctime
 * @prop {Number} mtime
 * @prop {Object} site
 * @prop {String} site.url
 * @prop {String} site.title
 * @prop {Object} metadata
 * @prop {String[]} links
 * @prop {String} [content]
 * @prop {Object} [notification]
 * @prop {Number} [notification.id]
 * @prop {String} [notification.type]
 * @prop {String} [notification.subject]
 * @prop {Boolean} [notification.isRead]
 */

 // util funcs
 // =

/**
 * @param {String} url
 * @param {String?} base
 * @returns {ParsedUrl}
 */
export function parseUrl (url, base = undefined) {
  let urlp = new URL(url, base)
  return {
    origin: urlp.protocol + '//' + urlp.hostname,
    path: urlp.pathname + urlp.search + urlp.hash
  }
}
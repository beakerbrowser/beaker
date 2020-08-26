import { Indexer } from './indexer'
import { INDEX_IDS, METADATA_KEYS, NOTIFICATION_TYPES } from './const'
import markdownLinkExtractor from 'markdown-link-extractor'

const IS_BLOG_PATH_RE = /^\/blog\/([^\/]+).md$/i
const IS_BOOKMARKS_PATH_RE = /^\/bookmarks\/([^\/]+).goto$/i
const IS_COMMENTS_PATH_RE = /^\/comments\/([^\/]+).md$/i
const IS_MICROBLOG_PATH_RE = /^\/microblog\/([^\/]+).md$/i
const IS_PAGES_PATH_RE = /^\/pages\/([^\/]+).md$/i
const IS_SUBSCRIPTIONS_PATH_RE = /^\/subscriptions\/([^\/]+).goto$/i

export const INDEXES = [
  new Indexer({
    id: INDEX_IDS.blogposts,
    title: 'Blogposts',
    liveQuery: ['/blog/*.md'],
    filter (update) {
      return IS_BLOG_PATH_RE.test(update.path)
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* records_data.key, records_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata).map(([key, value]) => {
          return [key, value]
        })
      ]
    },
    notifications: [
      /* records_data.key, notification type */
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.bookmarks,
    title: 'Bookmarks',
    liveQuery: ['/bookmarks/*.goto'],
    filter (update) {
      return IS_BOOKMARKS_PATH_RE.test(update.path)
    },
    async getData (site, update) {
      return [
        /* records_data.key, records_data.value */
        ...Object.entries(update.metadata).map(([key, value]) => {
          if (key === 'pinned') key = METADATA_KEYS.pinned
          return [key, value]
        })
      ]
    },
    notifications: [
      /* records_data.key, notification type */
      [METADATA_KEYS.href, NOTIFICATION_TYPES.bookmark]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.comments,
    title: 'Comments',
    liveQuery: ['/comments/*.md'],
    filter (update) {
      return IS_COMMENTS_PATH_RE.test(update.path)
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* records_data.key, records_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata)
      ]
    },
    notifications: [
      /* records_data.key, notification type */
      [METADATA_KEYS.subject, NOTIFICATION_TYPES.comment],
      [METADATA_KEYS.parent, NOTIFICATION_TYPES.reply],
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.microblogposts,
    title: 'Microblog Posts',
    liveQuery: ['/microblog/*.md'],
    filter (update) {
      return IS_MICROBLOG_PATH_RE.test(update.path)
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* records_data.key, records_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata)
      ]
    },
    notifications: [
      /* records_data.key, notification type */
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),
  
  new Indexer({
    id: INDEX_IDS.pages,
    title: 'Pages',
    liveQuery: ['/pages/*.md'],
    filter (update) {
      return IS_PAGES_PATH_RE.test(update.path)
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* records_data.key, records_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata).map(([key, value]) => {
          if (key === 'title') key = METADATA_KEYS.title
          return [key, value]
        })
      ]
    },
    notifications: [
      /* records_data.key, notification type */
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.subscriptions,
    title: 'Subscriptions',
    liveQuery: ['/subscriptions/*.goto'],
    filter (update) {
      return IS_SUBSCRIPTIONS_PATH_RE.test(update.path)
    },
    async getData (site, update) {
      return [
        /* records_data.key, records_data.value */
        ...Object.entries(update.metadata).map(([key, value]) => {
          if (key === 'title') key = METADATA_KEYS.title
          return [key, value]
        })
      ]
    },
    notifications: [
      /* records_data.key, notification type */
      [METADATA_KEYS.href, NOTIFICATION_TYPES.subscribe]
    ]
  }),
]
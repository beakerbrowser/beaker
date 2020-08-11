import { Indexer } from './indexer'
import { FILE_TYPES, INDEX_IDS, METADATA_KEYS, NOTIFICATION_TYPES } from './const'
import markdownLinkExtractor from 'markdown-link-extractor'

const IS_BLOG_PATH_RE = /^\/blog\/([^\/]+).md$/i
const IS_BOOKMARKS_PATH_RE = /^\/bookmarks\/([^\/]+).goto$/i
const IS_MICROBLOG_PATH_RE = /^\/microblog\/([^\/]+).md$/i

export const INDEXES = [
  new Indexer({
    id: INDEX_IDS.blogposts,
    title: 'Blogposts',
    filter (update) {
      return (
        (update.path.endsWith('.md') && update.metadata.type === FILE_TYPES.blogpost)
        || (!update.metadata.type && IS_BLOG_PATH_RE.test(update.path))
      )
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* resources_data.key, resources_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata).map(([key, value]) => {
          if (key === 'title') key = METADATA_KEYS.title
          return [key, value]
        })
      ]
    },
    notifications: [
      /* resources_data.key, notification type */
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.bookmarks,
    title: 'Bookmarks',
    filter (update) {
      return (
        (update.path.endsWith('.goto') && update.metadata.type === FILE_TYPES.bookmark)
        || (!update.metadata.type && IS_BOOKMARKS_PATH_RE.test(update.path))
      )
    },
    async getData (site, update) {
      return [
        /* resources_data.key, resources_data.value */
        ...Object.entries(update.metadata).map(([key, value]) => {
          if (key === 'href') key = METADATA_KEYS.href
          if (key === 'title') key = METADATA_KEYS.title
          if (key === 'pinned') key = METADATA_KEYS.pinned
          return [key, value]
        })
      ]
    },
    notifications: [
      /* resources_data.key, notification type */
      [METADATA_KEYS.href, NOTIFICATION_TYPES.bookmark]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.comments,
    title: 'Comments',
    filter (update) {
      return update.path.endsWith('.md') && update.metadata.type === FILE_TYPES.comment
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* resources_data.key, resources_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata)
      ]
    },
    notifications: [
      /* resources_data.key, notification type */
      [METADATA_KEYS.subject, NOTIFICATION_TYPES.comment],
      [METADATA_KEYS.parent, NOTIFICATION_TYPES.reply],
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),

  new Indexer({
    id: INDEX_IDS.microblogposts,
    title: 'Microblog Posts',
    filter (update) {
      return (
        (update.path.endsWith('.md') && update.metadata.type === FILE_TYPES.microblogpost)
        || (!update.metadata.type && IS_MICROBLOG_PATH_RE.test(update.path))
      )
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* resources_data.key, resources_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata)
      ]
    },
    notifications: [
      /* resources_data.key, notification type */
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  }),
  
  new Indexer({
    id: INDEX_IDS.pages,
    title: 'Pages',
    filter (update) {
      return update.path.endsWith('.md') && update.metadata.type === FILE_TYPES.page
    },
    async getData (site, update) {
      let content = await site.fetch(update.path)
      let contentLinks = markdownLinkExtractor(content)
      return [
        /* resources_data.key, resources_data.value */
        [METADATA_KEYS.content, content],
        ...contentLinks.map(url => ([METADATA_KEYS.link, url])),
        ...Object.entries(update.metadata).map(([key, value]) => {
          if (key === 'title') key = METADATA_KEYS.title
          return [key, value]
        })
      ]
    },
    notifications: [
      /* resources_data.key, notification type */
      [METADATA_KEYS.link, NOTIFICATION_TYPES.mention]
    ]
  })
]
import { slugifyUrl, DAT_KEY_REGEX, joinPath } from './strings.js'
import { queryRead, queryHas, ensureParentDir, ensureMount, ensureUnmount, getAvailableName } from './fs.js'

// typedefs
// =

/**
 * @typedef {import('./fs.js').FSQueryResult} FSQueryResult
 * @typedef {import('./fs.js').DriveInfo} DriveInfo
 *
 * @typedef {FSQueryResult} Comment
 * @prop {string} content.type
 * @prop {string} content.href
 * @prop {string} [content.replyTo]
 * @prop {string} content.body
 * @prop {Date} content.createdAt
 * @prop {Date} [content.updatedAt]
 *
 * @typedef {Comment} ThreadedComment
 * @prop {ThreadedComment} parent
 * @prop {ThreadedComment[]} [replies]
 * @prop {number} replyCount
 *
 * @typedef {FSQueryResult} Bookmark
 * @prop {string} content.type
 * @prop {string} content.href
 * @prop {string} content.title
 * @prop {string} content.description
 * @prop {Date} content.createdAt
 * @prop {Date} [content.updatedAt]
 *
 * @typedef {FSQueryResult} Annotation
 * @prop {string} content.type
 * @prop {string[]} content.tags
 * @prop {number} [content.vote]
 *
 * @typedef {Object} TabulatedAnnotationTag
 * @prop {string} tag
 * @prop {string[]} authors
 *
 * @typedef {Object} TabulatedAnnotations
 * @prop {string[]} upvoters
 * @prop {string[]} downvoters
 * @prop {TabulatedAnnotationTag[]} tags
 */

// exported
// =

var profileCache = {}
export const profiles = {
  /**
   * @param {string} key 
   * @returns {Promise<DriveInfo?>}
   */
  async get (key) {
    var match = DAT_KEY_REGEX.exec(key)
    if (match) key = match[0]
    else key = await DatArchive.resolveName(key)

    // check cache
    if (profileCache[key]) {
      return profileCache[key]
    }

    // check network expanding from self -> friends -> foafs
    var entry
    for (let path of ['/profile', '/profile/friends/*', '/profile/friends/*/friends/*']) {
      var res = /** @type FSQueryResult[] */(await navigator.filesystem.query({path, mount: key}))
      if (res[0]) {
        entry = /** @type FSQueryResult */(res[0])
        break
      }
    }
    return entry ? entry.mount : undefined
  }
}

export const library = {
  /**
   * @param {string} url
   * @param {string} title
   * @returns {Promise<void>}
   */
  async add (url, title = 'untitled') {
    var name = await getAvailableName('/library', title)
    await ensureMount(joinPath('/library', name), url)
  },

  /**
   * @param {string} url
   * @returns {Promise<void>}
   */
  async remove (url) {
    var files = await navigator.filesystem.query({mount: url, path: '/library/*'})
    for (let file of files) {
      await ensureUnmount(file.path)
    }
  }
}

export const friends = {
  /**
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.target]
   * @returns {Promise<FSQueryResult[]>}
   */
  async list ({author, target} = {author: undefined, target: undefined}) {
    return navigator.filesystem.query({
      path: getFriendPaths(author),
      mount: target
    })
  },

  /**
   * @param {string} url
   * @param {string} title
   * @returns {Promise<void>}
   */
  async add (url, title = 'anonymous') {
    var name = await getAvailableName('/profile/friends', title)
    await ensureMount(joinPath('/profile/friends', name), url)
  },

  /**
   * @param {string} urlOrName
   * @returns {Promise<void>}
   */
  async remove (urlOrName) {
    var mount = await navigator.filesystem.query({path: '/profile/friends/*', mount: urlOrName})
    if (mount[0]) return navigator.filesystem.unmount(mount[0].path)

    try {
      await navigator.filesystem.stat(`/profile/friends/${urlOrName}`)
    } catch (e) {
      return // dne
    }
    return navigator.filesystem.unmount(`/profile/friends/${urlOrName}`)
  }
}

export const feed = {
  /**
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @param {number} [query.offset]
   * @param {number} [query.limit]
   * @returns {Promise<FSQueryResult[]>}
   */
  async list ({author, sort, reverse, offset, limit} = {author: undefined, sort: undefined, reverse: undefined, offset: undefined, limit: undefined}) {
    return queryRead({path: getFeedPaths(author), sort, reverse, offset, limit})
  }
}

export const bookmarks = {
  /**
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<Bookmark[]>}
   */
  async list ({author, href, sort, reverse} = {author: undefined, href: undefined, sort: undefined, reverse: undefined}) {
    var bookmarks = await queryRead({path: getBookmarkPaths(author, href), sort, reverse})
    return bookmarks.filter(massageBookmark)
  },

  /**
   * @param {string} href
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<Boolean>}
   */
  async isBookmarked (href, {author, sort, reverse} = {author: undefined, sort: undefined, reverse: undefined}) {
    return queryHas({path: getBookmarkPaths(author, href), sort, reverse})
  },

  /**
   * @param {Object} bookmark
   * @param {string} bookmark.href
   * @param {string} bookmark.title
   * @param {string} [bookmark.description]
   * @param {boolean} bookmark.isPublic
   * @returns {Promise<string>}
   */
  async add ({href, title, description, isPublic}) {
    var slug = slugifyUrl(href)
    var path = isPublic ? `/profile/data/unwalled.garden/bookmarks/${slug}.json` : `/data/unwalled.garden/bookmarks/${slug}.json`

    await ensureParentDir(path)
    await navigator.filesystem.writeFile(path, JSON.stringify({
      type: 'unwalled.garden/bookmark',
      href,
      title,
      description,
      createdAt: (new Date()).toISOString()
    }, null, 2))

    return path
  },

  /**
   * @param {string} bookmarkPath
   * @param {Object} bookmark
   * @param {string} [bookmark.href]
   * @param {string} [bookmark.title]
   * @param {string} [bookmark.description]
   * @param {boolean} [bookmark.isPublic]
   * @returns {Promise<string>}
   */
  async update (bookmarkPath, {href, title, description, isPublic}) {
    // read existing
    var oldBookmark = {}
    try {
      oldBookmark = JSON.parse(await navigator.filesystem.readFile(bookmarkPath))
    } catch (e) {
      // ignore
    }
    href = href || oldBookmark.href

    var slug = slugifyUrl(href)
    var path = isPublic ? `/profile/data/unwalled.garden/bookmarks/${slug}.json` : `/data/unwalled.garden/bookmarks/${slug}.json`

    // remove old if changing isPublic
    if (bookmarkPath !== path) {
      try {
        await navigator.filesystem.unlink(bookmarkPath)
      } catch (e) {
        // ignore
      }
    }

    // write new
    await ensureParentDir(path)
    await navigator.filesystem.writeFile(path, JSON.stringify({
      type: 'unwalled.garden/bookmark',
      href: typeof href === 'string' ? href : oldBookmark.href,
      title: typeof title === 'string' ? title : oldBookmark.title,
      description: typeof description === 'string' ? description : oldBookmark.description,
      createdAt: oldBookmark.createdAt || (new Date()).toISOString(),
      updatedAt: (new Date()).toISOString()
    }, null, 2))

    return path
  },

  /**
   * @param {string} bookmarkPath
   * @returns {Promise<void>}
   */
  async remove (bookmarkPath) {
    await navigator.filesystem.unlink(bookmarkPath)
  }
}

export const comments = {
  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<Comment[]>}
   */
  async list ({author, href, sort, reverse} = {author: undefined, href: undefined, sort: undefined, reverse: undefined}) {
    var comments = await queryRead({path: getCommentPaths(author, href), sort, reverse})
    return comments.filter(massageComment)
  },

  /**
   * @param {string} href
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.parent]
   * @param {number} [query.depth]
   * @returns {Promise<ThreadedComment[]>}
   */
  async thread (href, {author, parent, depth} = {author: undefined, parent: undefined, depth: undefined}) {
    var comments = await queryRead({path: getCommentPaths(author, href)})
    comments = comments.filter(massageComment)

    // create a map of comments by their URL
    var commentsByUrl = {}
    comments.forEach(comment => { commentsByUrl[comment.url] = comment })

    // attach each comment to its parent, forming a tree
    var rootComments = []
    comments.forEach(comment => {
      if (comment.content.replyTo) {
        let parent = commentsByUrl[comment.content.replyTo]
        if (!parent) {
          // TODO insert a placeholder parent when not found
          // something that means "this post was by somebody you dont follow"
          // -prf
          return
        }
        if (!parent.replies) {
          parent.replies = []
          parent.replyCount = 0
        }
        parent.replies.push(comment)
        parent.replyCount++
      } else {
        rootComments.push(comment)
      }
    })

    // apply the parent filter
    if (parent) {
      rootComments = []
      comments.forEach(comment => {
        if (comment.content.replyTo === parent) {
          rootComments.push(comment)
        }
      })
    }

    // apply the depth limit
    if (depth) {
      let recursiveApplyDepth = (currentDepth, comment) => {
        if (!comment.replies) return
        if (currentDepth === depth) {
          comment.replies = null
        } else {
          comment.replies.forEach(reply => recursiveApplyDepth(currentDepth + 1, reply))
        }
      }
      rootComments.forEach(comment => recursiveApplyDepth(1, comment))
    }

    return rootComments
  },

  /**
   * @param {Object} comment
   * @param {string} comment.href
   * @param {string} [comment.replyTo]
   * @param {string} comment.body
   * @returns {Promise<string>}
   */
  async add ({href, replyTo, body}) {
    var path = `/profile/data/unwalled.garden/comments/${slugifyUrl(href)}/${Date.now()}.json`
    await ensureParentDir(path)
    await navigator.filesystem.writeFile(path, JSON.stringify({
      type: 'unwalled.garden/comment',
      href,
      replyTo,
      body,
      createdAt: (new Date()).toISOString()
    }))
    return path
  },

  /**
   * @param {string} commentPath
   * @param {Object} comment
   * @param {string} [comment.replyTo]
   * @param {string} [comment.body]
   * @returns {Promise<string>}
   */
  async update (commentPath, {replyTo, body}) {
     // read existing
     var oldComment = {}
     try {
       oldComment = JSON.parse(await navigator.filesystem.readFile(commentPath))
     } catch (e) {
       throw new Error(`Failed to read comment-file for update: ${e.toString()}`)
     }

     // write new
     await ensureParentDir(commentPath)
     await navigator.filesystem.writeFile(commentPath, JSON.stringify({
       type: 'unwalled.garden/comment',
       href: oldComment.href,
       replyTo: typeof replyTo === 'string' ? replyTo : oldComment.replyTo,
       body: typeof body === 'string' ? body : oldComment.body,
       createdAt: oldComment.createdAt || (new Date()).toISOString(),
       updatedAt: (new Date()).toISOString()
     }, null, 2))

     return commentPath
  },

  /**
   * @param {string} commentPath
   * @returns {Promise<void>}
   */
  async remove (commentPath) {
    await navigator.filesystem.unlink(commentPath)
  }
}

export const annotations = {
  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<Annotation[]>}
   */
  async list ({author, href, sort, reverse} = {author: undefined, href: undefined, sort: undefined, reverse: undefined}) {
    var annotations = await queryRead({path: getAnnotationPaths(author, href), sort, reverse})
    return annotations.filter(massageAnnotation)
  },

  /**
   * @param {string} href
   * @param {Object} query
   * @param {string} [query.author]
   * @returns {Promise<TabulatedAnnotations>}
   */
  async tabulate (href, {author} = {author: undefined}) {
    var annotations = /** @type Annotation[] */(await queryRead({path: getAnnotationPaths(author, href)}))
    annotations = annotations.filter(massageAnnotation)

    // construct tabulated list
    var tags = {}
    var upvoters = []
    var downvoters = []
    annotations.forEach(annotation => {
      if (annotation.vote === 1) upvoters.push(annotation.drive.url)
      else if (annotation.vote === -1) downvoters.push(annotation.drive.url)
      annotation.tags.forEach(tags => {
        if (!tags[tags]) {
          tags[tags] = {tags, authors: [annotation.drive.url]}
        } else {
          tags[tags].authors.push(annotation.drive.url)
        }
      })
    })

    return {upvoters, downvoters, tags: Object.values(tags)}
  },
  /**
   * @param {string} href
   * @returns {Promise<Annotation>}
   */
  async get (href) {
    var annotations = await queryRead({path: getAnnotationPaths('me', href)})
    return annotations.filter(massageAnnotation)[0]
  },

  /**
   * @param {string} href
   * @param {Object} annotation
   * @param {string[]} [annotation.tags]
   * @param {number} [annotation.vote]
   * @returns {Promise<string>}
   */
  async put (href, {tags, vote} = {tags: undefined, vote: undefined}) {
    var path = `/profile/data/unwalled.garden/annotations/${slugifyUrl(href)}.json`
    await ensureParentDir(path)
    await navigator.filesystem.writeFile(path, JSON.stringify({
      type: 'unwalled.garden/annotation',
      href,
      tags,
      vote
    }))
    return path
  },

  /**
   * @param {string} href
   * @returns {Promise<void>}
   */
  async remove (href) {
    var path = `/profile/data/unwalled.garden/annotations/${slugifyUrl(href)}.json`
    await navigator.filesystem.unlink(path)
  }
}

// internal
// =

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getFriendPaths (author) {
  if (author === 'me') {
    return `/profile/friends/*`
  } else if (author) {
    return `/profile/friends/${author}/friends/*`
  } else {
    return [
      `/profile/friends/*`,
      `/profile/friends/*/friends/*`
    ]
  }
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getFeedPaths (author) {
  if (author === 'me') {
    return `/profile/feed/*`
  } else if (author) {
    return `/profile/friends/${author}/feed/*`
  } else {
    return [
      `/profile/feed/*`,
      `/profile/friends/*/feed/*`
    ]
  }
}

/**
 * @param {string} author
 * @param {string?} href
 * @returns {string|string[]}
 */
function getBookmarkPaths (author, href = undefined) {
  var filename = (href ? slugifyUrl(href) : '*') + '.json'
  if (author === 'me') {
    return [`/data/unwalled.garden/bookmarks/${filename}`, `/profile/data/unwalled.garden/bookmarks/${filename}`]
  } else if (author) {
    return `/profile/friends/${author}/data/unwalled.garden/bookmarks/${filename}`
  } else {
    return [
      `/data/unwalled.garden/bookmarks/${filename}`,
      `/profile/data/unwalled.garden/bookmarks/${filename}`,
      `/profile/friends/*/data/unwalled.garden/bookmarks/${filename}`
    ]
  }
}

/**
 * @param {string} author
 * @param {string?} href
 * @returns {string|string[]}
 */
function getCommentPaths (author, href = undefined) {
  var foldername = (href ? slugifyUrl(href) : '*')
  if (author === 'me') {
    return `/profile/data/unwalled.garden/comments/${foldername}/*.json`
  } else if (author) {
    return `/profile/friends/${author}/data/unwalled.garden/comments/${foldername}/*.json`
  } else {
    return [
      `/profile/data/unwalled.garden/comments/${foldername}/*.json`,
      `/profile/friends/*/data/unwalled.garden/comments/${foldername}/*.json`
    ]
  }
}

/**
 * @param {string} author
 * @param {string?} href
 * @returns {string|string[]}
 */
function getAnnotationPaths (author, href = undefined) {
  var filename = (href ? slugifyUrl(href) : '*') + '.json'
  if (author === 'me') {
    return `/profile/data/unwalled.garden/annotations/${filename}`
  } else if (author) {
    return `/profile/friends/${author}/data/unwalled.garden/annotations/${filename}`
  } else {
    return [
      `/profile/data/unwalled.garden/annotations/${filename}`,
      `/profile/friends/*/data/unwalled.garden/annotations/${filename}`
    ]
  }
}

/**
 * @param {Bookmark} bookmark
 * @returns {boolean}
 */
function massageBookmark (bookmark) {
  if (!bookmark.content || typeof bookmark.content !== 'object') return false
  if (bookmark.content.type !== 'unwalled.garden/bookmark') return false
  bookmark.content.href = typeof bookmark.content.href === 'string' ? bookmark.content.href : undefined
  bookmark.content.title = typeof bookmark.content.title === 'string' ? bookmark.content.title : undefined
  bookmark.content.description = typeof bookmark.content.description === 'string' ? bookmark.content.description : undefined
  bookmark.content.createdAt = typeof bookmark.content.createdAt === 'string' ? new Date(bookmark.content.createdAt) : undefined
  bookmark.content.updatedAt = typeof bookmark.content.updatedAt === 'string' ? new Date(bookmark.content.updatedAt) : undefined
  bookmark.content.isPublic = bookmark.path.startsWith('/profile')
  return true
}

/**
 * @param {Comment} comment
 * @returns {boolean}
 */
function massageComment (comment) {
  if (!comment.content || typeof comment.content !== 'object') return false
  if (comment.content.type !== 'unwalled.garden/comment') return false
  comment.content.href = typeof comment.content.href === 'string' ? comment.content.href : undefined
  comment.content.replyTo = typeof comment.content.replyTo === 'string' ? comment.content.replyTo : undefined
  comment.content.body = typeof comment.content.body === 'string' ? comment.content.body : undefined
  comment.content.createdAt = typeof comment.content.createdAt === 'string' ? new Date(comment.content.createdAt) : undefined
  comment.content.updatedAt = typeof comment.content.updatedAt === 'string' ? new Date(comment.content.updatedAt) : undefined
  return true
}

const VALID_VOTES = [-1, 0, 1]
/**
 * @param {Annotation} annotation
 * @returns {boolean}
 */
function massageAnnotation (annotation) {
  if (!annotation.content || typeof annotation.content !== 'object') return false
  if (annotation.content.type !== 'unwalled.garden/annotation') return false
  annotation.content.tags = Array.isArray(annotation.content.tags) ? annotation.content.tags.map(tag => tag.toString()) : []
  annotation.content.vote = VALID_VOTES.includes(annotation.content.vote) ? annotation.content.vote : undefined
  return true
}
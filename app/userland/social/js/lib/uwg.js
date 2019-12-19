import { normalizeUrl, slugifyUrl, DAT_KEY_REGEX, joinPath } from './strings.js'
import { queryRead, ensureDir, ensureParentDir, ensureMount, ensureUnmount, getAvailableName } from './fs.js'
import { lock } from './lock.js'

// typedefs
// =

/**
 * @typedef {import('./fs.js').FSQueryResult} FSQueryResult
 * @typedef {import('./fs.js').DriveInfo} DriveInfo
 * 
 * @typedef {DriveInfo} SocialProfile
 * @prop {boolean} isUser
 * @prop {boolean} isUserFollowing
 * @prop {boolean} isFollowingUser
 * @prop {DriveInfo[]} followers
 * @prop {DriveInfo[]} following
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

var user = undefined
var profileCache = {}
export const profiles = {
  setUser (u) {
    user = u
  },

  /**
   * @param {string} key 
   * @returns {Promise<SocialProfile>}
   */
  async get (key) {
    var match = DAT_KEY_REGEX.exec(key)
    if (match) key = match[0]
    else key = await DatArchive.resolveName(key)

    // check cache
    if (profileCache[key]) {
      return await profileCache[key]
    }

    profileCache[key] = (async function () {
      var drive = new DatArchive(key)
      var profile = await drive.getInfo()
      profile.isUser = profile.url === user.url
      profile.followers = undefined
      profile.following = undefined
      profile.isFollowingUser = undefined
      profile.isUserFollowing = undefined
      return profile
    })()

    return await profileCache[key]
  },

  async readSocialGraph (prof, user, {includeProfiles} = {includeProfiles: false}) {
    // lock this read to be sequential to avoid overloading the hyperdrive stack
    let release = await lock('read-social-graph')
    try {
      if (prof.followers && prof.following) return
      var key = prof.url.slice('dat://'.length)

      var [followersQuery, followingQuery] = await Promise.all([
        friends.list({target: key}, {includeProfiles}),
        friends.list({author: key}, {includeProfiles})
      ])

      prof.followers = followersQuery.map(item => item.drive)
      prof.following = followingQuery.map(item => item.mount)
      prof.isFollowingUser = Boolean(prof.following.find(f => f.url === user.url))
      prof.isUserFollowing = Boolean(prof.followers.find(f => f.url === user.url))
    } finally {
      release()
    }
  },

  async readProfile (item) {
    item.drive = typeof item.drive === 'string' ? await profiles.get(item.drive) : item.drive
    item.mount = typeof item.mount === 'string' ? await profiles.get(item.mount) : item.mount
  },

  async readAllProfiles (items) {
    await Promise.all(items.map(profiles.readProfile))
  }
}

export const friends = {
  /**
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.target]
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @returns {Promise<FSQueryResult[]>}
   */
  async list ({author, target} = {author: undefined, target: undefined}, {includeProfiles} = {includeProfiles: false}) {
    var drive = (author && author !== 'me') ? new DatArchive(author) : navigator.filesystem
    let results = await drive.query({
      type: 'mount',
      path: getFriendPaths(author),
      mount: target
    })
    if (includeProfiles) {
      await profiles.readAllProfiles(results)
    }
    return results
  },

  /**
   * @param {string} url
   * @param {string} title
   * @param {Object} [drive]
   * @returns {Promise<void>}
   */
  async add (url, title = 'anonymous', drive = undefined) {
    var path = drive ? '/friends' : '/profile/friends'
    drive = drive || navigator.filesystem
    await ensureDir(path, drive)
    var mount = await drive.query({path: `${path}/*`, mount: url})
    if (mount[0]) return
    var name = await getAvailableName(path, title, drive)
    await ensureMount(joinPath(path, name), url, drive)
  },

  /**
   * @param {string} urlOrName
   * @param {Object} [drive]
   * @returns {Promise<void>}
   */
  async remove (urlOrName, drive = undefined) {
    var path = drive ? '/friends' : '/profile/friends'
    drive = drive || navigator.filesystem

    var mount = await drive.query({path: `${path}/*`, mount: urlOrName})
    if (mount[0]) return drive.unmount(mount[0].path)

    try {
      await drive.stat(`${path}/${urlOrName}`)
    } catch (e) {
      return // dne
    }
    return drive.unmount(`${path}/${urlOrName}`)
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
    var drive = (author && author !== 'me') ? new DatArchive(author) : navigator.filesystem
    var res = await queryRead({path: getFeedPaths(author), sort, reverse, offset, limit}, drive)
    await profiles.readAllProfiles(res)
    return res
  },

  /**
   * 
   * @param {string} author 
   * @param {string} name 
   * @returns {Promise<FSQueryResult>}
   */
  async get (author, name) {
    let path = `/feed/${name}`
    let drive = new DatArchive(author)
    let url = drive.url + path
    return {
      type: 'file',
      path,
      url,
      stat: await drive.stat(path),
      drive: await drive.getInfo(),
      mount: undefined,
      content: await drive.readFile(path)
    }
  },

  /**
   * @param {string} content
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async add (content, drive = undefined) {
    var path = drive ? `/feed/${Date.now()}.md` : `/profile/feed/${Date.now()}.md`
    drive = drive || navigator.filesystem
    await ensureParentDir(path, drive)
    await drive.writeFile(path, content)
    return path
  },

  /**
   * @param {string} statusPath
   * @returns {Promise<void>}
   */
  async remove (statusPath) {
    await navigator.filesystem.unlink(statusPath)
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
    comments = comments.filter(massageComment)
    await profiles.readAllProfiles(comments)
    return comments
  },

  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<Comment[]>}
   */
  async count ({author, href, sort, reverse} = {author: undefined, href: undefined, sort: undefined, reverse: undefined}) {
    var comments = await navigator.filesystem.query({path: getCommentPaths(author, href), sort, reverse})
    return comments.length
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
    await profiles.readAllProfiles(comments)

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
    var path = `/profile/comments/${slugifyUrl(href)}/${Date.now()}.json`
    await ensureDir('/profile/comments')
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

export const likes = {
  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<FSQueryResult[]>}
   */
  async list ({author, href, sort, reverse} = {author: undefined, href: undefined, sort: undefined, reverse: undefined}) {
    var drive = (author && author !== 'me') ? new DatArchive(author) : navigator.filesystem
    var res = await drive.query({
      path: getLikePaths(author),
      metadata: {href},
      sort,
      reverse
    })
    await profiles.readAllProfiles(res)
    return res
  },

  /**
   * @param {string} href
   * @param {Object} query
   * @param {string} [query.author]
   * @returns {Promise<DriveInfo[]>}
   */
  async tabulate (href, {author} = {author: undefined}) {
    var drive = (author && author !== 'me') ? new DatArchive(author) : navigator.filesystem
    var likes = await drive.query({
      path: getLikePaths(author),
      metadata: {href}
    })
    await profiles.readAllProfiles(likes)

    // construct tabulated list
    var likers = {}
    likes.forEach(like => {
      if (!(like.drive.url in likers)) {
        likers[like.drive.url] = like.drive
      }
    })

    return Object.values(likers)
  },

  /**
   * @param {string} href
   * @returns {Promise<String>}
   */
  async get (author, href) {
    href = normalizeUrl(href)
    var drive = (author && author !== 'me') ? new DatArchive(author) : navigator.filesystem
    var likes = await drive.query({
      path: getLikePaths(author),
      metadata: {href}
    })
    return likes[0] ? likes[0].path : undefined
  },

  /**
   * @param {string} href
   * @returns {Promise<string>}
   */
  async put (href) {
    href = normalizeUrl(href)
    if (await likes.get('me', href)) {
      return
    }

    var path = `/profile/links/likes/${Date.now()}.goto`
    await ensureDir('/profile/links')
    await ensureDir('/profile/links/likes')
    await navigator.filesystem.writeFile(path, '', {metadata: {href}})
    return path
  },

  /**
   * @param {string} href
   * @returns {Promise<void>}
   */
  async remove (href) {
    href = normalizeUrl(href)
    var path = await likes.get('me', href)
    if (path) await navigator.filesystem.unlink(path)
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
    var path = `/profile/annotations/${slugifyUrl(href)}.json`
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
    var path = `/profile/annotations/${slugifyUrl(href)}.json`
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
    return `/friends/*`
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
    return `/feed/*`
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
function getCommentPaths (author, href = undefined) {
  var foldername = (href ? slugifyUrl(href) : '*')
  if (author === 'me') {
    return `/profile/comments/${foldername}/*.json`
  } else if (author) {
    return `/profile/friends/${author}/comments/${foldername}/*.json`
  } else {
    return [
      `/profile/comments/${foldername}/*.json`,
      `/profile/friends/*/comments/${foldername}/*.json`
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
    return `/profile/annotations/${filename}`
  } else if (author) {
    return `/profile/friends/${author}/annotations/${filename}`
  } else {
    return [
      `/profile/annotations/${filename}`,
      `/profile/friends/*/annotations/${filename}`
    ]
  }
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getLikePaths (author) {
  if (author === 'me') {
    return `/profile/links/likes/*.goto`
  } else if (author) {
    return `/links/likes/*.goto`
  } else {
    return [
      `/profile/links/likes/*.goto`,
      `/profile/friends/*/links/likes/*.goto`
    ]
  }
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
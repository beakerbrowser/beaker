import { normalizeUrl, DRIVE_KEY_REGEX, joinPath } from './strings.js'
import { queryRead, ensureDir, ensureParentDir, ensureMount, ensureUnmount, getAvailableName } from './fs.js'
import { lock } from './lock.js'
import { isFilenameBinary } from './is-ext-binary.js'

// typedefs
// =

/**
 * @typedef {import('./fs.js').FSQueryResult} FSQueryResult
 * @typedef {import('./fs.js').DriveInfo} DriveInfo
 * 
 * @typedef {DriveInfo} UserProfile
 * @prop {string} id
 * @prop {boolean} isUser
 * 
 * @typedef {FSQueryResult} Post
 *
 * @typedef {FSQueryResult} Comment
 * @prop {string} content
 *
 * @typedef {Comment} ThreadedComment
 * @prop {ThreadedComment} parent
 * @prop {ThreadedComment[]} [replies]
 * @prop {number} replyCount
 * 
 * @typedef {Object} TabulatedVotes
 * @prop {DriveInfo[]} upvotes
 * @prop {DriveInfo[]} downvotes
 */

// exported
// =

var user = undefined
var userDrive = undefined
var groupDrive = hyperdrive.self
var profileCache = {}
export const profiles = {
  async setUser (url) {
    userDrive = hyperdrive.load(url)
    user = await profiles.get(url)
    user.isUser = true
    return user
  },

  getUser () {
    return user
  },

  /**
   * @param {string} key 
   * @returns {Promise<UserProfile>}
   */
  async get (key) {
    key = await toKey(key)

    // check cache
    if (profileCache[key]) {
      return await profileCache[key]
    }

    profileCache[key] = (async function () {
      var drive = hyperdrive.load(key)
      var profile = await drive.getInfo()
      profile.isUser = false
      profile.id = await groupDrive.query({path: '/users/*', mount: profile.url})
        .then(res => res[0].path.split('/').pop())
        .catch(e => undefined)
      return profile
    })()

    return await profileCache[key]
  },

  async readProfile (item) {
    item.drive = typeof item.drive === 'string' ? await profiles.get(item.drive) : item.drive
    item.mount = typeof item.mount === 'string' ? await profiles.get(item.mount) : item.mount
  },

  async readAllProfiles (items) {
    await Promise.all(items.map(profiles.readProfile))
  }
}

export const users = {
  /**
   * @param {Object} [query]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @param {number} [query.offset]
   * @param {number} [query.limit]
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @returns {Promise<UserProfile[]>}
   */
  async list (
    {sort, reverse, offset, limit} = {sort: undefined, reverse: undefined, offset: undefined, limit: undefined},
    {includeProfiles} = {includeProfiles: false}
  ) {
    var mounts = await groupDrive.query({
      path: '/users/*',
      type: 'mount',
      sort,
      reverse,
      offset,
      limit
    })

    if (includeProfiles) {
      return Promise.all(mounts.map(mount => profiles.get(mount.stat.mount.key)))
    } else {
      return mounts.map(mount => {
        return {
          url: `hyper://${mount.stat.mount.key}`,
          id: mount.path.split('/').pop()
        }
      })
    }
  },

  /**
   * @returns {Promise<Number>}
   */
  async count () {
    var mounts = await groupDrive.query({
      path: '/users/*',
      type: 'mount'
    })
    return mounts.length
  },

  /**
   * @param {string} id 
   * @returns {Promise<UserProfile>}
   */
  async getByUserID (id) {
    var stat = await groupDrive.stat(`/users/${id}`).catch(e => undefined)
    if (stat && stat.mount.key) {
      return profiles.get(stat.mount.key)
    } else {
      throw new Error('User not found')
    }
  },

  /**
   * @param {string} key 
   * @returns {Promise<UserProfile>}
   */
  async getByKey (key) {
    key = await toKey(key)
    let res = await groupDrive.query({path: '/users/*', mount: key})
    if (!res[0]) throw new Error('User not found')
    return profiles.get(key)
  },

  /**
   * @param {string} key 
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async add (key, id) {
    if (!key) throw new Error('The user URL is required')
    if (!id) throw new Error('The user ID is required')
    if (!isValidUserID(id)) throw new Error(`The user ID "${id}" is not valid`)

    var st = await groupDrive.stat(`/users/${id}`).catch(e => undefined)
    if (st) throw new Error(`The user ID "${id}" is already taken`)

    var mounts = await groupDrive.query({
      path: '/users/*',
      mount: key
    })
    if (mounts[0]) {
      throw new Error(`This user is already a member of the group`)
    }

    await ensureDir('/users', groupDrive)
    await groupDrive.mount(`/users/${id}`, key)
  },
  
  /**
   * @param {string} oldId 
   * @param {string} newId
   * @returns {Promise<void>}
   */
  async rename (oldId, newId) {
    if (!oldId) throw new Error('The previous user ID is required')
    if (!newId) throw new Error('The new user ID is required')
    if (!isValidUserID(newId)) throw new Error(`The user ID "${newId}" is not valid`)

    var st = await groupDrive.stat(`/users/${oldId}`)
      .catch(e => { throw new Error(`There is no user named "${oldId}"`) })
    if (!st.mount.key) throw new Error('The specified user ID does not point to a user drive')
    await groupDrive.unmount(`/users/${oldId}`)
    await groupDrive.mount(`/users/${newId}`, st.mount.key)
  },

  /**
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async removeByUserID (id) {
    if (!id) throw new Error('The user ID is required')
    await groupDrive.unmount(`/users/${id}`)
  },

  /**
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async removeByKey (key) {
    if (!key) throw new Error('The key is required')
    key = await toKey(key)
    var mounts = await groupDrive.query({
      path: '/users/*',
      mount: key
    })
    if (mounts[0]) {
      await groupDrive.unmount(mounts[0].path)
    }
  }
}

export const posts = {
  /**
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.driveType]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @param {number} [query.offset]
   * @param {number} [query.limit]
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @param {boolean} [opts.includeContent]
   * @returns {Promise<Post[]>}
   */
  async list (
    {author, driveType, sort, reverse, offset, limit} = {author: undefined, driveType: undefined, sort: undefined, reverse: undefined, offset: undefined, limit: undefined},
    {includeProfiles, includeContent} = {includeProfiles: false, includeContent: true}
  ) {
    var drive = hyperdrive.load(author || location)
    var queryFn = includeContent ? queryRead : (q, drive) => drive.query(q)
    var posts = await queryFn({
      path: getPostsPaths(author),
      metadata: driveType ? {'drive-type': driveType} : undefined,
      sort,
      reverse, 
      offset,
      limit
    }, drive)
    posts = posts.filter(post => {
      if (!isNonemptyString(post.stat.metadata.title)) {
        return false
      }
      if (post.path.endsWith('.goto')) {
        return (
          isNonemptyString(post.stat.metadata.href)
          && isUrl(post.stat.metadata.href)
        )
      }
      if (includeContent && post.path.endsWith('.md') || post.path.endsWith('.txt')) {
        return isNonemptyString(post.content)
      }
      return true
    })
    if (includeProfiles) {
      await profiles.readAllProfiles(posts)
    }
    return posts
  },

  /**
   * 
   * @param {string} author 
   * @param {string} path 
   * @returns {Promise<Post>}
   */
  async get (author, path) {
    let drive = hyperdrive.load(author)
    let url = drive.url + path
    return {
      type: 'file',
      path,
      url,
      stat: await drive.stat(path),
      drive: await profiles.get(author),
      mount: undefined,
      content: isFilenameBinary(path) ? undefined : await drive.readFile(path)
    }
  },

  /**
   * @param {Object} post
   * @param {string} post.href
   * @param {string} post.title
   * @param {string} [post.driveType]
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async addLink ({href, title, driveType}, drive = undefined) {
    if (!isNonemptyString(href)) throw new Error('URL is required')
    if (!isUrl(href)) throw new Error('Invalid URL')
    if (!isNonemptyString(title)) throw new Error('Title is required')
    if (driveType && !isNonemptyString(driveType)) throw new Error('DriveType must be a string')

    href = normalizeUrl(href)
    drive = drive || userDrive
    var path = `/beaker-forum/posts/${Date.now()}.goto`
    await ensureParentDir(path, drive)
    await drive.writeFile(path, '', {metadata: {href, title, 'drive-type': driveType}})
    return path
  },

  /**
   * @param {Object} post
   * @param {string} post.title
   * @param {string} post.content
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async addTextPost ({title, content}, drive = undefined) {
    if (!isNonemptyString(content)) throw new Error('Content is required')
    if (!isNonemptyString(title)) throw new Error('Title is required')
    drive = drive || userDrive
    var path = `/beaker-forum/posts/${Date.now()}.md`
    await ensureParentDir(path, drive)
    await drive.writeFile(path, content, {metadata: {title}})
    return path
  },

  /**
   * @param {Object} post
   * @param {string} post.title
   * @param {string} post.ext
   * @param {string} post.base64buf
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async addFile ({title, ext, base64buf}, drive = undefined) {
    if (!isNonemptyString(base64buf)) throw new Error('Base64buf is required')
    if (!isNonemptyString(ext)) throw new Error('File extension is required')
    if (!isNonemptyString(title)) throw new Error('Title is required')

    drive = drive || userDrive
    var path = `/beaker-forum/posts/${Date.now()}.${ext}`
    await ensureParentDir(path, drive)
    await drive.writeFile(path, base64buf, {encoding: 'base64', metadata: {title}})
    return path
  },

  /**
   * @param {Post} post 
   * @param {string} newTitle 
   */
  async changeTitle (post, newTitle) {
    if (!isNonemptyString(newTitle)) throw new Error('Title is required')
    var filename = post.path.split('/').pop()
    var path = `/beaker-forum/posts/${filename}`
    var metadata = Object.assign({}, post.stat.metadata, {title: newTitle})
    await userDrive.writeFile(path, post.content || '', {metadata})
  },

  /**
   * @param {Post} post
   * @returns {Promise<void>}
   */
  async remove (post) {
    var filename = post.path.split('/').pop()
    var path = `/beaker-forum/posts/${filename}`
    await userDrive.unlink(path)
  }
}

var commentCache = {}
export const comments = {
  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @param {number} [query.offset]
   * @param {number} [query.limit]
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @param {boolean} [opts.includeContent]
   * @returns {Promise<Comment[]>}
   */
  async list (
    {author, href, sort, reverse, offset, limit} = {author: undefined, href: undefined, sort: undefined, reverse: undefined, offset: undefined, limit: undefined},
    {includeProfiles, includeContent} = {includeProfiles: false, includeContent: true}
  ) {
    var drive = hyperdrive.load(author || location)
    href = href ? normalizeUrl(href) : undefined
    var queryFn = includeContent ? queryRead : (q, drive) => drive.query(q)
    var comments = await queryFn({
      path: getCommentsPaths(author),
      metadata: href ? {href} : undefined,
      sort,
      reverse,
      offset,
      limit
    }, drive)
    if (includeContent) {
      comments = comments.filter(c => isNonemptyString(c.content))
    }
    if (includeProfiles) {
      await profiles.readAllProfiles(comments)
    }
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
    href = href ? normalizeUrl(href) : undefined
    let drive = hyperdrive.load(author || location)
    // commented out in favor of the cache
    // var comments = await drive.query({
    //   path: getCommentsPaths(author),
    //   metadata: href ? {href} : undefined,
    //   sort,
    //   reverse
    // })
    var ckey = author || 'default'
    if (!commentCache[ckey]) {
      commentCache[ckey] = await drive.query({
        path: getCommentsPaths(author)
      })
    }
    var comments = commentCache[ckey]
    if (href) comments = comments.filter(comment => comment.stat.metadata.href === href)
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
    href = normalizeUrl(href)
    var drive = hyperdrive.load(author || location)
    var comments = await queryRead({
      path: getCommentsPaths(author),
      metadata: href ? {href} : undefined
    }, drive)
    comments = comments.filter(c => isNonemptyString(c.content))
    await profiles.readAllProfiles(comments)

    // create a map of comments by their URL
    var commentsByUrl = {}
    comments.forEach(comment => { commentsByUrl[comment.url] = comment })

    // attach each comment to its parent, forming a tree
    var rootComments = []
    comments.forEach(comment => {
      if (comment.stat.metadata.parent) {
        let parent = commentsByUrl[comment.stat.metadata.parent]
        if (!parent) {
          // TODO note this? somehow?
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
        if (comment.stat.metadata.parent === parent) {
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
   * 
   * @param {string} author 
   * @param {string} path 
   * @returns {Promise<Comment>}
   */
  async get (author, path) {
    let drive = hyperdrive.load(author)
    let url = drive.url + path
    return {
      type: 'file',
      path,
      url,
      stat: await drive.stat(path),
      drive: await profiles.get(author),
      mount: undefined,
      content: await drive.readFile(path),
    }
  },

  /**
   * @param {Object} comment
   * @param {string} comment.href
   * @param {string} [comment.parent]
   * @param {string} comment.content
   * @returns {Promise<string>}
   */
  async add ({href, parent, content}, drive = undefined) {
    if (!isNonemptyString(href)) throw new Error('URL is required')
    if (!isUrl(href)) throw new Error('Invalid URL')
    if (!isNonemptyString(content)) throw new Error('Content is required')
    
    href = normalizeUrl(href)

    var path = `/beaker-forum/comments/${Date.now()}.md`
    drive = drive || userDrive
    await ensureParentDir(path, drive)
    await drive.writeFile(path, content, {metadata: {href, parent}})
    return path
  },

  /**
   * @param {Comment} comment
   * @param {Object} updates
   * @param {string} [updates.content]
   * @returns {Promise<string>}
   */
  async update (comment, {content}) {
    if (!isNonemptyString(content)) throw new Error('Content is required')
    var commentPath = `/beaker-forum/comments/${comment.path.split('/').pop()}`
    
    var stat
    try {
      stat = await userDrive.stat(commentPath)
    } catch (e) {
      throw new Error(`Failed to read comment-file for update: ${e.toString()}`)
    }

    await userDrive.writeFile(commentPath, content, {metadata: stat.metadata})
    return commentPath
  },

  /**
   * @param {Comment} comment
   * @returns {Promise<void>}
   */
  async remove (comment) {
    var commentPath = `/beaker-forum/comments/${comment.path.split('/').pop()}`
    await userDrive.unlink(commentPath)
  }
}

var voteCache = {}
export const votes = {
  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @param {string} [query.href]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @returns {Promise<FSQueryResult[]>}
   */
  async list ({author, href, sort, reverse} = {author: undefined, href: undefined, sort: undefined, reverse: undefined}) {
    href = href ? normalizeUrl(href) : undefined
    var drive = hyperdrive.load(author || location)
    var res = await drive.query({
      path: getVotesPaths(author),
      metadata: href ? {href} : undefined,
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
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @param {boolean} [opts.noCache]
   * @returns {Promise<TabulatedVotes>}
   */
  async tabulate (href, {author} = {author: undefined}, {includeProfiles, noCache} = {includeProfiles: false, noCache: false}) {
    href = normalizeUrl(href)
    var drive = hyperdrive.load(author || location)
    // commented out in favor of the cache
    // var votes = await drive.query({
    //   path: getVotesPaths(author),
    //   metadata: {href}
    // })
    if (!voteCache[author] || noCache) {
      voteCache[author] = await drive.query({
        path: getVotesPaths(author)
      })
    }
    var votes = voteCache[author].filter(item => item.stat.metadata.href === href)

    if (includeProfiles) {
      await profiles.readAllProfiles(votes)
    }

    // construct tabulated list
    var upvotes = new Set()
    var downvotes = new Set()
    for (let vote of votes) {
      if (Number(vote.stat.metadata.vote) === -1) {
        upvotes.delete(vote.drive)
        downvotes.add(vote.drive)
      } else {
        upvotes.add(vote.drive)
        downvotes.delete(vote.drive)
      }
    }

    return {
      upvotes: Array.from(upvotes),
      downvotes: Array.from(downvotes)
    }
  },

  /**
   * @param {string} href
   * @returns {Promise<FSQueryResult>}
   */
  async get (author, href) {
    href = normalizeUrl(href)
    var drive = hyperdrive.load(author || location)
    var votes = await drive.query({
      path: getVotesPaths(author),
      metadata: {href}
    })
    return votes[0] ? votes[0] : undefined
  },

  /**
   * @param {string} href
   * @param {number} vote
   * @returns {Promise<string>}
   */
  async put (href, vote, drive = undefined) {
    if (!isNonemptyString(href)) throw new Error('URL is required')
    if (!isUrl(href)) throw new Error('Invalid URL')

    href = normalizeUrl(href)
    vote = vote == 1 ? 1 : vote == -1 ? -1 : 0
    drive = drive || userDrive

    var existingVote = await votes.get(drive.url, href)
    if (existingVote) await drive.unlink(existingVote.path)

    if (!vote) return

    var path = `/beaker-forum/votes/${Date.now()}.goto`
    await ensureParentDir(path, drive)
    await drive.writeFile(path, '', {metadata: {href, vote}})
    return path
  },

  /**
   * @param {Object} votes 
   * @param {string} subjectUrl 
   */
  getVoteBy (votes, subjectUrl) {
    if (!votes) return 0
    if (votes.upvotes.find(url => (url.url || url) === subjectUrl)) return 1
    if (votes.downvotes.find(url => (url.url || url) === subjectUrl)) return -1
    return 0
  }
}

// internal
// =

function isNonemptyString (v) {
  return v && typeof v === 'string'
}

function isUrl (v) {
  try {
    var u = new URL(v)
    return true
  } catch (e) {
    return false
  }
}

function isValidUserID (v) {
  return isNonemptyString(v) && /^[a-z][a-z0-9-\.]*$/i.test(v)
}

async function toKey (key) {
  var match = DRIVE_KEY_REGEX.exec(key)
  if (match) return match[0]
  return ''
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getPostsPaths (author) {
  if (author) {
    return `/beaker-forum/posts/*`
  } else {
    return `/users/*/beaker-forum/posts/*`
  }
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getCommentsPaths (author) {
  if (author) {
    return `/beaker-forum/comments/*.md`
  } else {
    return `/users/*/beaker-forum/comments/*.md`
  }
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getVotesPaths (author) {
  if (author) {
    return `/beaker-forum/votes/*.goto`
  } else {
    return `/users/*/beaker-forum/votes/*.goto`
  }
}

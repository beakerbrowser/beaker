import { normalizeUrl, normalizeTopic, isValidTopic, DAT_KEY_REGEX, joinPath } from './strings.js'
import { queryRead, ensureDir, ensureParentDir, ensureMount, ensureUnmount, getAvailableName } from './fs.js'
import { lock } from './lock.js'
import { DEFAULT_TOPICS } from './const.js'
import { isFilenameBinary } from './is-ext-binary.js'

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
 * @typedef {FSQueryResult} Post
 * @prop {string} topic
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
    else key = await Hyperdrive.resolveName(key)

    // check cache
    if (profileCache[key]) {
      return await profileCache[key]
    }

    profileCache[key] = (async function () {
      var drive = new Hyperdrive(key)
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
      var key = prof.url.slice('hd://'.length)

      var [followersQuery, followingQuery] = await Promise.all([
        follows.list({target: key}, {includeProfiles}),
        follows.list({author: key}, {includeProfiles})
      ])

      prof.followers = followersQuery.map(item => item.drive)
      prof.following = followingQuery.map(item => item.mount)
      prof.isFollowingUser = Boolean(prof.following.find(f => f === user.url))
      prof.isUserFollowing = Boolean(prof.followers.find(f => f === user.url))
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

export const follows = {
  /**
   * @param {Object} [query]
   * @param {string} [query.author]
   * @param {string} [query.target]
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @param {boolean} [opts.removeDuplicateMounts]
   * @returns {Promise<FSQueryResult[]>}
   */
  async list ({author, target} = {author: undefined, target: undefined}, {includeProfiles, removeDuplicateMounts} = {includeProfiles: false, removeDuplicateMounts: false}) {
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
    let results = await drive.query({
      type: 'mount',
      path: getFollowsPaths(author),
      mount: target
    })
    if (removeDuplicateMounts) {
      let results2 = []
      let set = new Set()
      for (const item of results) {
        if(!set.has(item.mount)){
          set.add(item.mount)
          results2.push(item)
        }
      }
      results = results2
    }
    if (includeProfiles) {
      await profiles.readAllProfiles(results)
    }
    return results
  },

  /**
   * @param {Object} query
   * @param {string} query.author
   * @param {string} query.target
   * @returns {Promise<boolean>}
   */
  async exists ({author, target}) {
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
    let results = await drive.query({
      type: 'mount',
      path: getFollowsPaths(author),
      mount: target,
      limit: 1
    })
    return !!results[0]
  },

  /**
   * @param {string} url
   * @param {string} title
   * @param {Object} [drive]
   * @returns {Promise<void>}
   */
  async add (url, title = 'anonymous', drive = undefined) {
    var path = drive ? '/follows' : '/profile/follows'
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
    var path = drive ? '/follows' : '/profile/follows'
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

export const posts = {
  /**
   * @param {Object} [query]
   * @param {string} [query.topic]
   * @param {string} [query.author]
   * @param {string} [query.driveType]
   * @param {string} [query.sort]
   * @param {boolean} [query.reverse]
   * @param {number} [query.offset]
   * @param {number} [query.limit]
   * @param {Object} [opts]
   * @param {boolean} [opts.includeProfiles]
   * @returns {Promise<Post[]>}
   */
  async list (
    {topic, author, driveType, sort, reverse, offset, limit} = {topic: undefined, author: undefined, driveType: undefined, sort: undefined, reverse: undefined, offset: undefined, limit: undefined},
    {includeProfiles} = {includeProfiles: false}
  ) {
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
    var posts = await queryRead({
      path: getPostsPaths(author, topic),
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
      if (post.path.endsWith('.md') || post.path.endsWith('.txt')) {
        return isNonemptyString(post.content)
      }
      return true
    })
    for (let post of posts) {
      let pathParts = post.path.split('/')
      post.topic = pathParts[pathParts.length - 2]
    }
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
    let drive = new Hyperdrive(author)
    let url = drive.url + path

    let pathParts = path.split('/')
    var topic = pathParts[pathParts.length - 2]

    return {
      type: 'file',
      path,
      url,
      stat: await drive.stat(path),
      drive: await profiles.get(author),
      mount: undefined,
      content: isFilenameBinary(path) ? undefined : await drive.readFile(path),
      topic
    }
  },

  /**
   * @param {Object} post
   * @param {string} post.href
   * @param {string} post.title
   * @param {string} post.topic
   * @param {string} [post.driveType]
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async addLink ({href, title, topic, driveType}, drive = undefined) {
    if (!isNonemptyString(href)) throw new Error('URL is required')
    if (!isUrl(href)) throw new Error('Invalid URL')
    if (!isNonemptyString(title)) throw new Error('Title is required')
    if (!isValidTopic(topic)) throw new Error('Topic is required')
    if (driveType && !isNonemptyString(driveType)) throw new Error('DriveType must be a string')

    href = normalizeUrl(href)
    topic = normalizeTopic(topic)
    var path = drive ? `/posts/${topic}/${Date.now()}.goto` : `/profile/posts/${topic}/${Date.now()}.goto`

    drive = drive || navigator.filesystem
    await ensureParentDir(path, drive, 2)
    await ensureParentDir(path, drive, 1)
    await drive.writeFile(path, '', {metadata: {href, title, 'drive-type': driveType}})
    return path
  },

  /**
   * @param {Object} post
   * @param {string} post.title
   * @param {string} post.topic
   * @param {string} post.content
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async addTextPost ({title, topic, content}, drive = undefined) {
    if (!isNonemptyString(content)) throw new Error('Content is required')
    if (!isNonemptyString(title)) throw new Error('Title is required')
    if (!isValidTopic(topic)) throw new Error('Topic is required')

    topic = normalizeTopic(topic)
    var path = drive ? `/posts/${topic}/${Date.now()}.md` : `/profile/posts/${topic}/${Date.now()}.md`

    drive = drive || navigator.filesystem
    await ensureParentDir(path, drive, 2)
    await ensureParentDir(path, drive, 1)
    await drive.writeFile(path, content, {metadata: {title}})
    return path
  },

  /**
   * @param {Object} post
   * @param {string} post.title
   * @param {string} post.topic
   * @param {string} post.ext
   * @param {string} post.base64buf
   * @param {Object} [drive]
   * @returns {Promise<string>}
   */
  async addFile ({title, topic, ext, base64buf}, drive = undefined) {
    if (!isNonemptyString(base64buf)) throw new Error('Base64buf is required')
    if (!isNonemptyString(ext)) throw new Error('File extension is required')
    if (!isNonemptyString(title)) throw new Error('Title is required')
    if (!isValidTopic(topic)) throw new Error('Topic is required')

    topic = normalizeTopic(topic)
    var path = drive ? `/posts/${topic}/${Date.now()}.${ext}` : `/profile/posts/${topic}/${Date.now()}.${ext}`

    drive = drive || navigator.filesystem
    await ensureParentDir(path, drive, 2)
    await ensureParentDir(path, drive, 1)
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
    var path = `/profile/posts/${post.topic}/${filename}`
    var metadata = Object.assign({}, post.stat.metadata, {title: newTitle})
    await navigator.filesystem.writeFile(path, post.content || '', {metadata})
  },

  /**
   * @param {Post} post
   * @returns {Promise<void>}
   */
  async remove (post) {
    var filename = post.path.split('/').pop()
    var path = `/profile/posts/${post.topic}/${filename}`
    await navigator.filesystem.unlink(path)
  }
}

export const topics = {
  /**
   * @param {Object} query
   * @param {string} [query.author]
   * @returns {Promise<Array<string>>}
   */
  async list ({author} = {author: undefined}) {
    var folders = await navigator.filesystem.query({
      type: 'directory',
      path: getTopicsPaths(author)
    })

    var topics = new Set()
    for (let folder of folders) {
      let name = folder.path.split('/').pop()
      if (!isValidTopic(name)) continue
      name = normalizeTopic(name)
      topics.add(name)
    }

    for (let t of DEFAULT_TOPICS) {
      topics.add(t)
    }

    return Array.from(topics)
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
   * @returns {Promise<Comment[]>}
   */
  async list ({author, href, sort, reverse, offset, limit} = {author: undefined, href: undefined, sort: undefined, reverse: undefined, offset: undefined, limit: undefined}) {
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
    href = href ? normalizeUrl(href) : undefined
    var comments = await queryRead({
      path: getCommentsPaths(author),
      metadata: href ? {href} : undefined,
      sort,
      reverse,
      offset,
      limit
    }, drive)
    comments = comments.filter(c => isNonemptyString(c.content))
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
    href = href ? normalizeUrl(href) : undefined
    // commented out in favor of the cache
    // var comments = await navigator.filesystem.query({
    //   path: getCommentsPaths(author),
    //   metadata: href ? {href} : undefined,
    //   sort,
    //   reverse
    // })
    var ckey = author || 'default'
    if (!commentCache[ckey]) {
      commentCache[ckey] = await navigator.filesystem.query({
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
    var comments = await queryRead({
      path: getCommentsPaths(author),
      metadata: href ? {href} : undefined
    })
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
    let drive = new Hyperdrive(author)
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

    var path = drive ? `/comments/${Date.now()}.md` : `/profile/comments/${Date.now()}.md`
    drive = drive || navigator.filesystem
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
    var commentPath = `/profile/comments/${comment.path.split('/').pop()}`
    
    var stat
    try {
      stat = await navigator.filesystem.stat(commentPath)
    } catch (e) {
      throw new Error(`Failed to read comment-file for update: ${e.toString()}`)
    }

    await navigator.filesystem.writeFile(commentPath, content, {metadata: stat.metadata})
    return commentPath
  },

  /**
   * @param {Comment} comment
   * @returns {Promise<void>}
   */
  async remove (comment) {
    var commentPath = `/profile/comments/${comment.path.split('/').pop()}`
    await navigator.filesystem.unlink(commentPath)
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
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
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
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
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
    var drive = (author && author !== 'me') ? new Hyperdrive(author) : navigator.filesystem
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

    var existingVote = await votes.get(drive ? drive.url : 'me', href)
    if (existingVote) await (drive || navigator.filesystem).unlink(existingVote.path)

    if (!vote) return

    var path = drive ? `/votes/${Date.now()}.goto` : `/profile/votes/${Date.now()}.goto`
    drive = drive || navigator.filesystem
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

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getFollowsPaths (author) {
  if (author === 'me') {
    return `/profile/follows/*`
  } else if (author) {
    return `/follows/*`
  } else {
    return [
      `/profile/follows/*`,
      `/profile/follows/*/follows/*`
    ]
  }
}

/**
 * @param {string} author
 * @param {string} [topic]
 * @returns {string|string[]}
 */
function getPostsPaths (author, topic = undefined) {
  topic = topic || '*'
  if (author === 'me') {
    return `/profile/posts/${topic}/*`
  } else if (author) {
    return `/posts/${topic}/*`
  } else {
    return [
      `/profile/posts/${topic}/*`,
      `/profile/follows/*/posts/${topic}/*`
    ]
  }
}

function getTopicsPaths (author) {
  if (author === 'me') {
    return `/profile/posts/*`
  } else if (author) {
    return `/posts/*`
  } else {
    return [
      `/profile/posts/*`,
      `/profile/follows/*/posts/*`
    ]
  }
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getCommentsPaths (author) {
  if (author === 'me') {
    return `/profile/comments/*.md`
  } else if (author) {
    return `/comments/*.md`
  } else {
    return [
      `/profile/comments/*.md`,
      `/profile/follows/*/comments/*.md`
    ]
  }
}

/**
 * @param {string} author
 * @returns {string|string[]}
 */
function getVotesPaths (author) {
  if (author === 'me') {
    return `/profile/votes/*.goto`
  } else if (author) {
    return `/votes/*.goto`
  } else {
    return [
      `/profile/votes/*.goto`,
      `/profile/follows/*/votes/*.goto`
    ]
  }
}

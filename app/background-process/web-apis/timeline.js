import assert from 'assert'
import {getProfileArchive, getAPI} from '../injests/profiles'
import normalizeUrl from 'normalize-url'

const NORMALIZE_OPTS = {
  stripFragment: false,
  stripWWW: false,
  removeQueryParameters: false
}

// exported api
// =

export default {
  // fetch a a post by url
  async getPost (href) {
    assertString(href, 'Parameter one must be a URL')
    href = normalizeUrl(href, NORMALIZE_OPTS)
    var archive = await getProfileArchive(0)
    var post = await getAPI().getPost(archive, href)
    if (post) return post
  },

  // list posts
  // - opts.author: url | DatArchive | Array<url | DatArchive>,
  // - opts.after: timestamp
  // - opts.before: timestamp
  // - opts.offset: number
  // - opts.limit: number
  // - opts.reverse: boolean
  // - opts.fetchAuthor: boolean
  // - opts.fetchReplies: boolean
  // - opts.countVotes: boolean
  async listPosts (opts) {
    return getAPI().listPosts(opts)
  },

  // - opts.author: url | DatArchive | Array<url | DatArchive>,
  // - opts.after: timestamp
  // - opts.before: timestamp
  // - opts.offset: number
  // - opts.limit: number
  // - opts.reverse: boolean
  async countPosts (opts) {
    return getAPI().countPosts(opts)
  },

  // create a post
  // - data.threadParent: url of post replying to
  // - data.threadRoot: url of topmost ancestor
  async post (data={}) {
    var archive = await getProfileArchive(0)
    return getAPI().post(archive, data)
  },

  // vote a post
  // data.subjectType: string
  async vote (subject, vote, data) {
    var archive = await getProfileArchive(0)
    assertString(subject, 'Parameter one must be a URL')
    assert(!!vote && typeof vote === 'number', 'Parameter two must be a number')
    data.vote = vote
    return getAPI().vote(archive, data)
  }
}

function assertString (v, msg) {
  assert(!!v && typeof v === 'string', msg)
}
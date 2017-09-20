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
    return getAPI().getPost(href)
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
  // - data.text: string
  // - data.threadParent: url of post replying to
  // - data.threadRoot: url of topmost ancestor
  async post (data={}) {
    var archive = await getProfileArchive(0)
    return getAPI().post(archive, data)
  },

  // vote a post
  // - vote: number, -1 or 0 or 1
  // - subject: url of the subject
  // - subjectType: string, eg 'post'
  async vote (vote, subject, subjectType) {
    var archive = await getProfileArchive(0)
    assert(typeof vote === 'number', 'Parameter 1 must be -1, 0, or 1 (vote value)')
    assertString(subject, 'Parameter 2 must be a URL (the subject of the vote)')
    assertString(subjectType, 'Parameter 3 must be a string (subject type, such as "post")')
    return getAPI().vote(archive, {vote, subjectType, subject})
  }
}

function assertString (v, msg) {
  assert(!!v && typeof v === 'string', msg)
}
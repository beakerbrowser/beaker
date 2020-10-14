export function typeToQuery (type) {
  let query = ({
    'blogpost': '/blog/*.md',
    'bookmark': '/bookmarks/*.goto',
    'comment': '/comments/*.md',
    'microblogpost': '/microblog/*.md',
    'page': '/pages/*.md',
    'subscription': '/subscriptions/*.goto',
    'tag': '/tags/*.goto',
    'vote': '/votes/*.goto'
  })[type]
  if (!query) throw new Error('Invalid type: ' + type)
  return query
}

const RECORD_TYPE_RES = {
  blogpost: /^\/blog\/([^\/])+\.md$/i,
  bookmark: /^\/bookmarks\/([^\/])+\.goto$/i,
  comment: /^\/comments\/([^\/])+\.md$/i,
  microblogpost: /^\/microblog\/([^\/])+\.md$/i,
  page: /^\/pages\/([^\/])+\.md$/i,
  subscription: /^\/subscriptions\/([^\/])+\.goto$/i,
  tag: /^\/tags\/([^\/])+\.goto$/i,
  vote: /^\/votes\/([^\/])+\.goto$/i
}

export function getRecordType (record) {
  for (let type in RECORD_TYPE_RES) {
    if (RECORD_TYPE_RES[type].test(record?.path)) {
      return type
    }
  }
  return 'unknown'
}

export function getPreferredRenderMode (record) {
  let type = getRecordType(record)
  if (['comment', 'microblogpost'].includes(type)) {
    return 'card'
  }
  if (['subscription', 'tag', 'vote'].includes(type)) {
    return 'action'
  }
  return 'link'
}
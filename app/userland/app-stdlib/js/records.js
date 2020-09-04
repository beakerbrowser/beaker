export function typeToQuery (type) {
  let query = ({
    'blogpost': {prefix: '/blog', mimetype: 'text/markdown'},
    'bookmark': {prefix: '/bookmarks', mimetype: 'application/goto'},
    'comment': {prefix: '/comments', mimetype: 'text/markdown'},
    'microblogpost': {prefix: '/microblog', mimetype: 'text/markdown'},
    'page': {prefix: '/pages', mimetype: 'text/markdown'},
    'subscription': {prefix: '/subscriptions', mimetype: 'application/goto'},
    'vote': {prefix: '/votes', mimetype: 'application/goto'},
  })[type]
  if (!query) throw new Error('Invalid type: ' + type)
  return query
}

export function getRecordType (record) {
  if (record?.mimetype === 'application/goto') {
    if (record.prefix === '/bookmarks') return 'bookmark'
    if (record.prefix === '/subscriptions') return 'subscription'
    if (record.prefix === '/votes') return 'vote'
  } else if (record?.mimetype === 'text/markdown') {
    if (record.prefix === '/blog') return 'blogpost'
    if (record.prefix === '/comments') return 'comment'
    if (record.prefix === '/microblog') return 'microblogpost'
    if (record.prefix === '/pages') return 'page'
  }
  return 'unknown'
}

export function getPreferredRenderMode (record) {
  let type = getRecordType(record)
  if (['comment', 'microblogpost'].includes(type)) {
    return 'card'
  }
  if (['subscription', 'vote'].includes(type)) {
    return 'action'
  }
  return 'link'
}
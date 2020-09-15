export function typeToQuery (type) {
  let query = ({
    'blogpost': '/blog/*.md',
    'bookmark': '/bookmarks/*.goto',
    'comment': '/comments/*.md',
    'microblogpost': '/microblog/*.md',
    'page': '/pages/*.md',
    'subscription': '/subscriptions/*.goto',
    'vote': '/votes/*.goto'
  })[type]
  if (!query) throw new Error('Invalid type: ' + type)
  return query
}

export function getRecordType (record) {
  if (record?.extension === '.goto') {
    if (record.prefix === '/bookmarks') return 'bookmark'
    if (record.prefix === '/subscriptions') return 'subscription'
    if (record.prefix === '/votes') return 'vote'
  } else if (record?.extension === '.md') {
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
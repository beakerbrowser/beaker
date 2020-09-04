export function typeToQuery (type) {
  let query = ({
    'blogpost': {prefix: '/blog', extension: '.md'},
    'bookmark': {prefix: '/bookmarks', extension: '.goto'},
    'comment': {prefix: '/comments', extension: '.md'},
    'microblogpost': {prefix: '/microblog', extension: '.md'},
    'page': {prefix: '/pages', extension: '.md'},
    'subscription': {prefix: '/subscriptions', extension: '.goto'},
    'vote': {prefix: '/votes', extension: '.goto'},
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
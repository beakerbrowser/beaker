export function getBasicType (type) {
  if (type && Array.isArray(type)) {
    if (type.includes('user')) return 'user'
    if (type.includes('web-page')) return 'web-page'
    if (type.includes('file-share')) return 'file-share'
    if (type.includes('image-collection')) return 'image-collection'
  }
  return 'other'
}

export function basicTypeToLabel (basicType) {
  switch (basicType) {
    case 'user': return 'user'
    case 'web-page': return 'web page'
    case 'image-collection': return 'image collection'
    case 'file-share': return 'file-share'
    default: return 'site'
  }
}
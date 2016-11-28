export function generate ({ url, title, description, author, forkOf, createdBy } = {}) {
  var manifest = { url }
  if (isString(title)) manifest.title = title
  if (isString(description)) manifest.description = description
  if (isString(author)) manifest.author = author
  if (isString(forkOf)) manifest.forkOf = [forkOf]
  if (isArrayOfStrings(forkOf)) manifest.forkOf = forkOf
  if (isString(createdBy)) manifest.createdBy = { url: manifest.createdBy }
  if (isCreatedByObj(createdBy)) manifest.createdBy = createdBy
  return manifest
}

function isString (v) {
  return typeof v === 'string'
}

function isArrayOfStrings (v) {
  return Array.isArray(v) && v.every(isString)
}

function isCreatedByObj (v) {
  return !!v && isString(v.url) && (!v.title || isString(v.title))
}
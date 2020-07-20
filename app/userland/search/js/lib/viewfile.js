export function validateViewfile (view) {
  if (typeof view.viewfile !== 'number' || view.viewfile < 1) {
    throw new Error('Unrecognized version ("viewfile" attribute): ' + view.viewfile)
  }
  if (!view.query || typeof view.query !== 'object') {
    throw new Error('No "query" is specified in the viewfile')
  }
  if (!view.query.path) {
    throw new Error('No "query.path" is specified in the viewfile')
  }
  if (Array.isArray(view.query.path)) {
    if (!view.query.path.every(p => typeof p === 'string')) {
      throw new Error('The "query.path" includes invalid (non-string) values')
    }
  } else if (typeof view.query.path !== 'string') {
    throw new Error('The "query.path" is invalid (it must be a string or array of strings)')
  }
}
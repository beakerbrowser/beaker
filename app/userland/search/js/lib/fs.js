import { joinPath, slugify } from './strings.js'

// exported
// =

/**
 * @param {Object} drive
 * @param {string} containingPath
 * @param {string} title
 * @param {string} ext
 * @returns {Promise<string>}
 */
export async function getAvailableName (drive, containingPath, title, ext = '') {
  var basename = slugify((title || '').trim() || 'untitled')
  for (let i = 1; i < 1e9; i++) {
    let name = ((i === 1) ? basename : `${basename}-${i}`) + (ext ? `.${ext}` : '')
    let st = await drive.stat(joinPath(containingPath, name)).catch(e => null)
    if (!st) return name
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + title)
}

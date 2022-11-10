import * as filesystem from './index'
import { query } from './query'
import { normalizeUrl } from '../../lib/urls'

// exported api
// =

export async function setup () {
  var privateDrive = filesystem.get()

  var exists = await privateDrive.pda.stat('/beaker/pins.json').catch(e => false)
  if (exists) return

  // migrate bookmarks
  var pins = []
  for (let bookmark of await query(privateDrive, {path: '/bookmarks/*.goto'})) {
    if (bookmark.stat.metadata.pinned || bookmark.stat.metadata['beaker/pinned']) {
      pins.push(normalizeUrl(bookmark.stat.metadata.href))
      await privateDrive.pda.deleteMetadata(bookmark.path, ['pinned', 'beaker/pinned'])
    }
  }
  await write(pins)
}

export async function getCurrent () {
  return read()
}

export async function isPinned (url) {
  return (await read()).includes(url)
}

export async function add (url) {
  var data = await read()
  if (!data.includes(url)) {
    data.push(url)
    await write(data)
  }
}

export async function remove (url) {
  var data = await read()
  var index = data.indexOf(url)
  if (index === -1) return
  data.splice(index, 1)
  await write(data)
}

// internal methods
// =

async function read () {
  var data
  try { data = await filesystem.get().pda.readFile('/beaker/pins.json').then(JSON.parse) }
  catch (e) { data = [] }
  data = data.filter(b => b && typeof b === 'string').map(v => normalizeUrl(v))
  return data
}

async function write (data) {
  data = data && Array.isArray(data) ? data : []
  data = data.filter(b => b && typeof b === 'string')
  await filesystem.get().pda.mkdir('/beaker').catch(e => undefined)
  await filesystem.get().pda.writeFile('/beaker/pins.json', JSON.stringify(data, null, 2))
}
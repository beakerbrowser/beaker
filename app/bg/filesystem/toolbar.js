import { basename } from 'path'
import { EventEmitter } from 'events'
import * as filesystem from './index'
import * as bookmarks from './bookmarks'
import * as rpc from 'pauls-electron-rpc'
import toolbarRPCManifest from '../rpc-manifests/toolbar'

// globals
// =

const events = new EventEmitter()

// exported api
// =

export const on = events.on.bind(events)
export const removeListener = events.removeListener.bind(events)

export async function getCurrent () {
  var data = await read()
  var items = []
  for (let item of data.items) {
    try {
      let st = await filesystem.get().pda.stat(`/bookmarks/${item.bookmark}`)
      items.push({
        bookmark: item.bookmark,
        href: st.metadata.href,
        title: st.metadata.title,
        openInPane: item.openInPane
      })
    } catch (e) {
      // skip
    }
  }

  return items
}

export async function getCurrentBookmark (href) {
  var current = await getCurrent()
  return current.find(item => item.href === href)
}

export async function includesList (bookmarks) {
  var data = await read()
  return bookmarks.map(bookmark => {
    return !!data.items.find(item => item.bookmark === bookmark)
  })
}

export async function add ({bookmark, openInPane}) {
  var data = await read()
  if (!data.items.find(item => item.bookmark === bookmark)) {
    data.items.push({bookmark, openInPane})
    await write(data)
    events.emit('changed')
  }
}

export async function update ({bookmark, openInPane}) {
  var data = await read()
  var item = data.items.find(item => item.bookmark === bookmark)
  if (item) {
    item.openInPane = openInPane
    await write(data)
    events.emit('changed')
  }
}

export async function remove ({bookmark}) {
  var data = await read()
  data.items = data.items.filter(item => item.bookmark !== bookmark)
  await write(data)
  events.emit('changed')
}

export async function ensure () {
  try {
    await filesystem.get().pda.stat('/toolbar.json')
  } catch (e) {
    var paths = await Promise.all([
      bookmarks.ensure({href: 'beaker://editor/', title: 'Editor'}),
      bookmarks.ensure({href: 'beaker://explorer/', title: 'Explore Files'}),
      bookmarks.ensure({href: 'beaker://webterm/', title: 'Terminal'}),
    ])
    await write({
      items: [
        {bookmark: basename(paths[0]), openInPane: true},
        {bookmark: basename(paths[1]), openInPane: true},
        {bookmark: basename(paths[2]), openInPane: true}
      ]
    })
  }
}

// internal methods
// =

async function read () {
  var data
  try { data = await filesystem.get().pda.readFile('/toolbar.json').then(JSON.parse) }
  catch (e) { data = {} }
  data.items = data.items && Array.isArray(data.items) ? data.items : []
  data.items = data.items.filter(b => b && typeof b === 'object' && typeof b.bookmark === 'string')
  return data
}

async function write (data) {
  data.items = data.items && Array.isArray(data.items) ? data.items : []
  data.items = data.items.filter(b => b && typeof b === 'object' && typeof b.bookmark === 'string')
  for (let item of data.items.slice()) {
    try {
      let st = await filesystem.get().pda.stat(`/bookmarks/${item.bookmark}`)
    } catch (e) {
      // remove
      data.items = data.items.filter(item2 => item !== item2)
    }
  }

  await filesystem.get().pda.writeFile('/toolbar.json', JSON.stringify(data, null, 2))
}


// rpc api
// =

rpc.exportAPI('background-process-toolbar', toolbarRPCManifest, {
  update,
  remove,

  async openEditModal () {
    // TODO
  }
})
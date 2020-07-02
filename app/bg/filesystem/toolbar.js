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
  var bookmarks = []
  for (let item of data.bookmarks) {
    try {
      let st = await filesystem.get().pda.stat(`/bookmarks/${item.filename}`)
      bookmarks.push({
        filename: item.filename,
        href: st.metadata.href,
        title: st.metadata.title,
        openInPane: item.openInPane
      })
    } catch (e) {
      // skip
    }
  }

  return bookmarks
}

export async function includesList (filenames) {
  var data = await read()
  return filenames.map(filename => {
    return !!data.bookmarks.find(item => item.filename === filename)
  })
}

export async function add ({filename, openInPane}) {
  var data = await read()
  if (!data.bookmarks.find(item => item.filename === filename)) {
    data.bookmarks.push({filename, openInPane})
    await write(data)
    events.emit('changed')
  }
}

export async function update ({filename, openInPane}) {
  var data = await read()
  var item = data.bookmarks.find(item => item.filename === filename)
  if (item) {
    item.openInPane = openInPane
    await write(data)
    events.emit('changed')
  }
}

export async function remove ({filename}) {
  var data = await read()
  data.bookmarks = data.bookmarks.filter(item => item.filename !== filename)
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
      bookmarks: [
        {filename: basename(paths[0]), openInPane: true},
        {filename: basename(paths[1]), openInPane: true},
        {filename: basename(paths[2]), openInPane: true}
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
  data.bookmarks = data.bookmarks && Array.isArray(data.bookmarks) ? data.bookmarks : []
  data.bookmarks = data.bookmarks.filter(b => b && typeof b === 'object' && typeof b.filename === 'string')
  return data
}

async function write (data) {
  data.bookmarks = data.bookmarks && Array.isArray(data.bookmarks) ? data.bookmarks : []
  data.bookmarks = data.bookmarks.filter(b => b && typeof b === 'object' && typeof b.filename === 'string')
  for (let item of data.bookmarks.slice()) {
    try {
      let st = await filesystem.get().pda.stat(`/bookmarks/${item.filename}`)
    } catch (e) {
      // remove
      data.bookmarks = data.bookmarks.filter(item2 => item !== item2)
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
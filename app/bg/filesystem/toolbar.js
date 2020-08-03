import { EventEmitter } from 'events'
import * as filesystem from './index'
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
  return (await read())?.items || []
}

export async function add ({url, type}) {
  var data = await read()
  if (!url || !data.items.find(item => item.url === url)) {
    data.items.push({url, type})
    await write(data)
    events.emit('changed')
  }
}

export async function remove (index) {
  var data = await read()
  data.items.splice(index, 1)
  await write(data)
  events.emit('changed')
}

export async function ensure () {
  try {
    await filesystem.get().pda.stat('/beaker/toolbar.json')
  } catch (e) {
    await write({
      items: [
        {url: 'beaker://activity/'},
        {url: 'beaker://editor/'},
        {url: 'beaker://explorer/'},
        {type: 'separator'},
        {url: 'beaker://library/'},
        {url: 'beaker://webterm/'}
      ]
    })
  }
}

// internal methods
// =

async function read () {
  var data
  try { data = await filesystem.get().pda.readFile('/beaker/toolbar.json').then(JSON.parse) }
  catch (e) { data = {} }
  data.items = data.items && Array.isArray(data.items) ? data.items : []
  data.items = data.items.filter(b => b && typeof b === 'object')
  return data
}

async function write (data) {
  data.items = data.items && Array.isArray(data.items) ? data.items : []
  data.items = data.items.filter(b => b && typeof b === 'object')
  await filesystem.get().pda.mkdir('/beaker').catch(e => undefined)
  await filesystem.get().pda.writeFile('/beaker/toolbar.json', JSON.stringify(data, null, 2))
}


// rpc api
// =

rpc.exportAPI('background-process-toolbar', toolbarRPCManifest, {
  add,
  remove
})
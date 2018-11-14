import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {swarmDat, shareDat} from './lib/dat-helpers'

const app = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
var createdDatUrl
var outsideDatUrl
var mainTab

test.before(async t => {
  console.log('starting experimental-library-web-api-test')
  await app.isReady

  // create the test archive
  var res = await app.executeJavascript(`
    DatArchive.create({title: 'Test Archive', description: 'Foo', prompt: false})
  `)
  createdDatUrl = res.url

  // share an outside dat
  var outsideDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  outsideDatUrl = 'dat://' + outsideDat.archive.key.toString('hex') + '/'

  // go to the site
  mainTab = app.getTab(0)
  await mainTab.navigateTo(createdDatUrl)
})
test.after.always('cleanup', async t => {
  await app.stop()
})

// tests
//

test('experiment must be opted into', async t => {
  // try without experiment set
  try {
    await mainTab.executeJavascript(`
      experimental.library.list()
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.is(e.name, 'PermissionsError')
  }

  // update manifest to include experiment
  await app.executeJavascript(`
    (async function () {
      try {
        var archive = new DatArchive("${createdDatUrl}")
        var manifest = JSON.parse(await archive.readFile('dat.json', 'utf8'))
        manifest.experimental = {apis: ['library']}
        await archive.writeFile('dat.json', JSON.stringify(manifest), 'utf8')
      } catch (e) {
        return e
      }
    })()
  `)
})

test('library.list()', async t => {
  // give time for the mtime to be read
  await new Promise(r => setTimeout(r, 1e3))

  // list (no options)
  var listingP = mainTab.executeJavascript(`
    experimental.library.list()
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // check results
  var listing = await listingP
  t.deepEqual(Object.keys(listing[0]).sort(), ['description', 'isOwner', 'mtime', 'peers', 'size', 'title', 'url', 'userSettings'].sort())
  t.deepEqual(Object.keys(listing[0].userSettings).sort(), ['expiresAt', 'isSaved'].sort())
  var item = listing.find(i => i.title === 'Test Archive')
  t.is(item.description, 'Foo')
  t.is(item.isOwner, true)
  t.is(typeof item.mtime, 'number')
  t.is(typeof item.peers, 'number')
  t.is(typeof item.size, 'number')
  t.is(item.title, 'Test Archive')
  t.is(typeof item.url, 'string')
  t.deepEqual(item.userSettings, {expiresAt: null, isSaved: true})
})

test('library.get()', async t => {
  var res = await mainTab.executeJavascript(`
    experimental.library.get("${createdDatUrl}")
  `)
  t.deepEqual(res, {expiresAt: null, isSaved: true})
})

test('library.add, library.remove, and "added" / "removed" events', async t => {
  // register event listeners
  await mainTab.executeJavascript(`
    window.stats = {
      adds: [],
      removes: []
    }
    experimental.library.addEventListener('added', event => {
      window.stats.adds.push({url: event.url, isSaved: event.isSaved})
    })
    experimental.library.addEventListener('removed', event => {
      window.stats.removes.push({url: event.url, isSaved: event.isSaved})
    })
  `)

  // by url
  var res = await mainTab.executeJavascript(`
    experimental.library.remove("${createdDatUrl}")
  `)
  t.deepEqual(res, {
    expiresAt: null,
    isSaved: false
  })
  var res = await mainTab.executeJavascript(`
    experimental.library.add("${createdDatUrl}")
  `)
  t.deepEqual(res, {
    expiresAt: null,
    isSaved: true
  })

  // by key
  var res = await mainTab.executeJavascript(`
    experimental.library.remove("${createdDatUrl.slice('dat://'.length)}")
  `)
  t.deepEqual(res, {
    expiresAt: null,
    isSaved: false
  })
  var res = await mainTab.executeJavascript(`
    experimental.library.add("${createdDatUrl.slice('dat://'.length)}")
  `)
  t.deepEqual(res, {
    expiresAt: null,
    isSaved: true
  })

  // check stats
  var stats = await mainTab.executeJavascript(`window.stats`)
  t.deepEqual(stats, {
    adds: [{url: createdDatUrl, isSaved: true}, {url: createdDatUrl, isSaved: true}],
    removes: [{url: createdDatUrl, isSaved: false}, {url: createdDatUrl, isSaved: false}]
  })
})

test('library.requestAdd()', async t => {
  // add fails on owned archives
  try {
    var res = await mainTab.executeJavascript(`
      experimental.library.requestAdd("${createdDatUrl}")
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.is(e.name, 'PermissionsError')
  }

  // add works on unowned archives
  var p = mainTab.executeJavascript(`
    experimental.library.requestAdd("${outsideDatUrl}")
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // check result
  t.deepEqual(await p, {
    isSaved: true
  })

  // add always asks permission
  var p = mainTab.executeJavascript(`
    experimental.library.requestAdd("${outsideDatUrl}")
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // check result
  t.deepEqual(await p, {
    isSaved: true,
    expiresAt: null
  })
})

test('library.requestRemove()', async t => {
  // remove fails on owned archives
  try {
    var res = await mainTab.executeJavascript(`
      experimental.library.requestRemove("${createdDatUrl}")
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.is(e.name, 'PermissionsError')
  }

  // remove works on unowned archives
  var p = mainTab.executeJavascript(`
    experimental.library.requestRemove("${outsideDatUrl}")
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // check result
  t.deepEqual(await p, {
    isSaved: false,
    expiresAt: null
  })

  // remove always asks permission
  var p = mainTab.executeJavascript(`
    experimental.library.requestRemove("${outsideDatUrl}")
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // check result
  t.deepEqual(await p, {
    isSaved: false,
    expiresAt: null
  })
})

test('library "updated" event', async t => {
  // register event listener
  var res = await mainTab.executeJavascript(`
    window.newTitle = false
    experimental.library.addEventListener('updated', event => {
      window.newTitle = event.title
    })
  `)

  // update manifest
  var res = await mainTab.executeJavascript(`
    (new DatArchive("${createdDatUrl}")).configure({ title: 'The New Title' })
  `)

  // check result
  await mainTab.waitFor(`!!window.newTitle`)
  var res = await mainTab.executeJavascript(`window.newTitle`)
  t.deepEqual(res, 'The New Title')
})

test('library "network-changed" event', async t => {
  // register event listener
  var res = await mainTab.executeJavascript(`
    window.networkChangedEvent = false
    experimental.library.addEventListener('network-changed', event => {
      window.networkChangedEvent = {
        url: event.url,
        connections: event.connections
      }
    })
  `)

  // swarm externally
  await swarmDat(createdDatUrl)

  // check result
  await mainTab.waitFor(`!!window.networkChangedEvent`)
  var res = await mainTab.executeJavascript(`window.networkChangedEvent`)
  t.deepEqual(res.connections, 1)
})

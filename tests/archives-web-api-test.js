import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

const app = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'),
    beaker_dat_quota_default_bytes_allowed: 1024 * 10 // 10kb
  }
})
var testStaticDat, testStaticDatURL
var createdDatURL // url of the dat which is created by testRunnerDat, which gives it write access
var createdDatKey
var draft1URL
var draft2URL

test.before(async t => {
  console.log('starting archives-web-api-test')
  await app.isReady

  // share the test static dat
  testStaticDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  testStaticDatURL = 'dat://' + testStaticDat.archive.key.toString('hex')

  // create a owned archive
  var res = await app.getTab(0).executeJavascript(`
    DatArchive.create({title: 'Test Archive', description: 'Is temporary', type: ['foo', 'bar'], prompt: false})
  `)
  createdDatURL = res.url
  createdDatKey = createdDatURL.slice('dat://'.length)
})
test.after.always('cleanup', async t => {
  await app.stop()
})

// tests
//

test('archives.add, archives.remove', async t => {
  // register event listeners
  await app.getTab(0).executeJavascript(`
    window.stats = {
      adds: 0,
      removes: 0
    }
    window.beaker.archives.addEventListener('added', event => {
      window.stats.adds++
    })
    window.beaker.archives.addEventListener('removed', event => {
      window.stats.removes++
    })
  `)

  // by url
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.add("${createdDatURL}")
  `)
  t.deepEqual(res.isSaved, true)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.remove("${createdDatURL}", {noPrompt: true})
  `)
  t.deepEqual(res.isSaved, false)

  // by key
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.add("${createdDatKey}")
  `)
  t.deepEqual(res.isSaved, true)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.remove("${createdDatKey}", {noPrompt: true})
  `)
  t.deepEqual(res.isSaved, false)

  // check stats
  var stats = await app.getTab(0).executeJavascript(`window.stats`)
  t.deepEqual(stats, {
    adds: 2,
    removes: 2
  })
})

test('archives.setUserSettings', async t => {
  // by url
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.setUserSettings("${createdDatURL}", {hidden: false})
  `)
  t.deepEqual(res.hidden, false)
})

test('archives.list', async t => {
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({isSaved: true})
  `)

  // add the owned and unowned dats
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.add("${createdDatURL}")
  `)
  t.deepEqual(res.isSaved, true)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.add("${testStaticDatURL}")
  `)
  t.deepEqual(res.isSaved, true)

  // list all
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({isSaved: true})
  `)
  var items = res
  t.deepEqual(items.length, 2)
  t.deepEqual(items[0].userSettings.isSaved, true)
  t.deepEqual(items[1].userSettings.isSaved, true)
  t.deepEqual(items[0].userSettings.autoDownload, true)
  t.deepEqual(items[1].userSettings.autoDownload, true)
  t.deepEqual(items.filter(i => i.isOwner).length, 1)

  // list owned
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({ isOwner: true })
  `)
  t.deepEqual(res.length, 1)

  // list unowned
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({ isOwner: false })
  `)
  res = res.filter(r => !r.title.toLowerCase().includes('beaker')) // sometimes the MOTD will load the beakerbrowser dat
  t.deepEqual(res.length, 1)

  // list by type
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({ type: 'foo' })
  `)
  t.deepEqual(res.length, 1)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({ type: 'bar' })
  `)
  t.deepEqual(res.length, 1)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({ type: 'baz' })
  `)
  t.deepEqual(res.length, 0)

})

test('hidden archives', async t => {
  // create a hidden archive
  var res = await app.getTab(0).executeJavascript(`
    DatArchive.create({title: 'Test Archive (draft 1)', description: 'Is temporary', type: ['foo', 'bar'], hidden: true, prompt: false})
  `)
  draft1URL = res.url

  // fork a hidden archive
  var res = await app.getTab(0).executeJavascript(`
    DatArchive.fork("${createdDatURL}", {hidden: true, prompt: false})
  `)
  draft2URL = res.url

  // list doesn't show hidden by default
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({isSaved: true})
  `)
  var items = res
  t.deepEqual(items.length, 2)
  t.deepEqual(items.map(item => item.url).sort(), [createdDatURL, testStaticDatURL].sort())

  // list shows hidden when specified
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.archives.list({isSaved: true, showHidden: true})
  `)
  var items = res
  t.deepEqual(items.length, 4)
  t.deepEqual(items.map(item => item.url).sort(), [createdDatURL, testStaticDatURL, draft1URL, draft2URL].sort())
})

test.skip('draft APIs', async t => {
  // add draft 1
  await app.getTab(0).executeJavascript(`
    beaker.archives.addDraft("${createdDatURL}", "${draft1URL}")
  `)

  // list
  var res = await app.getTab(0).executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 1)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[0].isActiveDraft, false)

  // add draft 2
  await app.getTab(0).executeJavascript(`
    beaker.archives.addDraft("${createdDatURL}", "${draft2URL}")
  `)

  // list
  var res = await app.getTab(0).executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 2)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[0].isActiveDraft, false)
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')
  t.is(res[1].isActiveDraft, false)

  // remove draft 2
  await app.getTab(0).executeJavascript(`
    beaker.archives.removeDraft("${createdDatURL}", "${draft2URL}")
  `)

  // list
  var res = await app.getTab(0).executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 1)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[0].isActiveDraft, false)

  // readd draft 2
  await app.getTab(0).executeJavascript(`
    beaker.archives.addDraft("${createdDatURL}", "${draft2URL}")
  `)

  // set draft 1 active
  await app.getTab(0).executeJavascript(`
    beaker.archives.setActiveDraft("${createdDatURL}", "${draft1URL}")
  `)

  // read active draft state
  var res = await app.getTab(0).executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 2)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[0].isActiveDraft, true)
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')
  t.is(res[1].isActiveDraft, false)

  // set draft 2 active
  await app.getTab(0).executeJavascript(`
    beaker.archives.setActiveDraft("${createdDatURL}", "${draft2URL}")
  `)

  // read active draft state
  var res = await app.getTab(0).executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 2)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[0].isActiveDraft, false)
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')
  t.is(res[1].isActiveDraft, true)

  // dont allow delete on the active draft
  await t.throws(app.getTab(0).executeJavascript(`
    beaker.archives.removeDraft("${createdDatURL}", "${draft2URL}")
  `))

  // set master active
  await app.getTab(0).executeJavascript(`
    beaker.archives.setActiveDraft("${createdDatURL}", "${createdDatURL}")
  `)

  // read active draft state
  var res = await app.getTab(0).executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 2)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[0].isActiveDraft, false)
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')
  t.is(res[1].isActiveDraft, false)
})

test('library "updated" event', async t => {
  // register event listener
  var res = await app.getTab(0).executeJavascript(`
    window.newTitle = false
    window.beaker.archives.addEventListener('updated', event => {
      window.newTitle = event.details.title
    })
  `)

  // update manifest
  var res = await app.getTab(0).executeJavascript(`
    (new DatArchive("${createdDatURL}")).configure({ title: 'The New Title' })
  `)

  // check result
  await app.getTab(0).waitFor(`!!window.newTitle`)
  var res = await app.getTab(0).executeJavascript(`window.newTitle`)
  t.deepEqual(res, 'The New Title')
})


function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

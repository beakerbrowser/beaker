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
  await app.isReady

  // share the test static dat
  testStaticDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  testStaticDatURL = 'dat://' + testStaticDat.archive.key.toString('hex')

  // create a owned archive
  var res = await app.executeJavascript(`
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

test('library.add, library.remove', async t => {
  // register event listeners
  await app.executeJavascript(`
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
  var res = await app.executeJavascript(`
    window.beaker.archives.add("${createdDatURL}")
  `)
  t.deepEqual(res.isSaved, true)
  var res = await app.executeJavascript(`
    window.beaker.archives.remove("${createdDatURL}", {noPrompt: true})
  `)
  t.deepEqual(res.isSaved, false)

  // by key
  var res = await app.executeJavascript(`
    window.beaker.archives.add("${createdDatKey}")
  `)
  t.deepEqual(res.isSaved, true)
  var res = await app.executeJavascript(`
    window.beaker.archives.remove("${createdDatKey}", {noPrompt: true})
  `)
  t.deepEqual(res.isSaved, false)

  // check stats
  var stats = await app.executeJavascript(`window.stats`)
  t.deepEqual(stats, {
    adds: 2,
    removes: 2
  })
})

test('library.list', async t => {
  // add the owned and unowned dats
  var res = await app.executeJavascript(`
    window.beaker.archives.add("${createdDatURL}")
  `)
  t.deepEqual(res.isSaved, true)
  var res = await app.executeJavascript(`
    window.beaker.archives.add("${testStaticDatURL}")
  `)
  t.deepEqual(res.isSaved, true)

  // list all
  var res = await app.executeJavascript(`
    window.beaker.archives.list()
  `)
  var items = res
  t.deepEqual(items.length, 2)
  t.deepEqual(items[0].userSettings.isSaved, true)
  t.deepEqual(items[1].userSettings.isSaved, true)
  t.deepEqual(items[0].userSettings.autoDownload, true)
  t.deepEqual(items[1].userSettings.autoDownload, true)
  t.deepEqual(items.filter(i => i.isOwner).length, 1)

  // list owned
  var res = await app.executeJavascript(`
    window.beaker.archives.list({ isOwner: true })
  `)
  t.deepEqual(res.length, 1)

  // list unowned
  var res = await app.executeJavascript(`
    window.beaker.archives.list({ isOwner: false })
  `)
  t.deepEqual(res.length, 1)

  // list by type
  var res = await app.executeJavascript(`
    window.beaker.archives.list({ type: 'foo' })
  `)
  t.deepEqual(res.length, 1)
  var res = await app.executeJavascript(`
    window.beaker.archives.list({ type: 'bar' })
  `)
  t.deepEqual(res.length, 1)
  var res = await app.executeJavascript(`
    window.beaker.archives.list({ type: 'baz' })
  `)
  t.deepEqual(res.length, 0)

})

test('hidden archives', async t => {
  // create a hidden archive
  var res = await app.executeJavascript(`
    DatArchive.create({title: 'Test Archive (draft 1)', description: 'Is temporary', type: ['foo', 'bar'], hidden: true, prompt: false})
  `)
  draft1URL = res.url

  // fork a hidden archive
  var res = await app.executeJavascript(`
    DatArchive.fork("${createdDatURL}", {hidden: true, prompt: false})
  `)
  draft2URL = res.url

  // list doesn't show hidden by default
  var res = await app.executeJavascript(`
    window.beaker.archives.list()
  `)
  var items = res
  t.deepEqual(items.length, 2)
  t.deepEqual(items.map(item => item.url).sort(), [createdDatURL, testStaticDatURL].sort())

  // list shows hidden when specified
  var res = await app.executeJavascript(`
    window.beaker.archives.list({showHidden: true})
  `)
  var items = res
  t.deepEqual(items.length, 4)
  t.deepEqual(items.map(item => item.url).sort(), [createdDatURL, testStaticDatURL, draft1URL, draft2URL].sort())
})

test('draft APIs', async t => {
  // draft info (no drafts)
  var res = await app.executeJavascript(`
    beaker.archives.getDraftInfo("${createdDatURL}")
  `)
  t.is(res.master.url, createdDatURL)
  t.is(res.drafts.length, 0)

  // add draft 1
  await app.executeJavascript(`
    beaker.archives.addDraft("${createdDatURL}", "${draft1URL}")
  `)

  // list
  var res = await app.executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 1)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')

  // draft info (1 draft)
  var res = await app.executeJavascript(`
    beaker.archives.getDraftInfo("${createdDatURL}")
  `)
  t.is(res.master.url, createdDatURL)
  t.is(res.drafts.length, 1)
  t.is(res.drafts[0].url, draft1URL)
  t.is(res.drafts[0].userSettings.localSyncPath, '')

  // add draft 2
  await app.executeJavascript(`
    beaker.archives.addDraft("${createdDatURL}", "${draft2URL}")
  `)

  // list
  var res = await app.executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 2)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')

  // draft info (2 drafts)
  var res = await app.executeJavascript(`
    beaker.archives.getDraftInfo("${createdDatURL}")
  `)
  t.is(res.master.url, createdDatURL)
  t.is(res.drafts.length, 2)
  t.is(res.drafts[0].url, draft1URL)
  t.is(res.drafts[0].userSettings.localSyncPath, '')
  t.is(res.drafts[1].url, draft2URL)
  t.is(res.drafts[1].userSettings.localSyncPath, '')

  // remove draft 2
  await app.executeJavascript(`
    beaker.archives.removeDraft("${createdDatURL}", "${draft2URL}")
  `)

  // list
  var res = await app.executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 1)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')

  // readd draft 2
  await app.executeJavascript(`
    beaker.archives.addDraft("${createdDatURL}", "${draft2URL}")
  `)

  // adding a draft (draft 3) to a draft (draft 1) will add the draft to its master
  var res = await app.executeJavascript(`DatArchive.fork("${createdDatURL}", {hidden: true, prompt: false})`)
  var draft3URL = res.url
  await app.executeJavascript(`beaker.archives.addDraft("${draft1URL}", "${draft3URL}")`)

  // list
  var res = await app.executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 3)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')
  t.is(res[2].url, draft3URL)
  t.is(res[2].userSettings.localSyncPath, '')

  // removing a draft (draft 3) from a draft (draft 1) will remove the draft from its master
  await app.executeJavascript(`beaker.archives.removeDraft("${draft1URL}", "${draft3URL}")`)

  // list
  var res = await app.executeJavascript(`
    beaker.archives.listDrafts("${createdDatURL}")
  `)
  t.is(res.length, 2)
  t.is(res[0].url, draft1URL)
  t.is(res[0].userSettings.localSyncPath, '')
  t.is(res[1].url, draft2URL)
  t.is(res[1].userSettings.localSyncPath, '')

  // draft info works when pulling from a draft url
  var res = await app.executeJavascript(`
    beaker.archives.getDraftInfo("${draft1URL}")
  `)
  t.is(res.master.url, createdDatURL)
  t.is(res.drafts.length, 2)
  t.is(res.drafts[0].url, draft1URL)
  t.is(res.drafts[0].userSettings.localSyncPath, '')
  t.is(res.drafts[1].url, draft2URL)
  t.is(res.drafts[1].userSettings.localSyncPath, '')
})

test('library "updated" event', async t => {
  // register event listener
  var res = await app.executeJavascript(`
    window.newTitle = false
    window.beaker.archives.addEventListener('updated', event => {
      window.newTitle = event.details.title
    })
  `)

  // update manifest
  var res = await app.executeJavascript(`
    (new DatArchive("${createdDatURL}")).configure({ title: 'The New Title' })
  `)

  // check result
  await app.waitFor(`!!window.newTitle`)
  var res = await app.executeJavascript(`window.newTitle`)
  t.deepEqual(res, 'The New Title')
})


function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

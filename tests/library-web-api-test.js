import test from 'ava'
import {Application} from 'spectron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

const app = new Application({
  path: electron,
  args: ['../app'],
  env: { 
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'),
    beaker_dat_quota_default_bytes_allowed: 1024 * 10 // 10kb
  }
})
var testStaticDat, testStaticDatURL
var createdDatURL // url of the dat which is created by testRunnerDat, which gives it write access
var createdDatKey

test.before(async t => {
  // open the window
  await app.start()
  await app.client.waitUntilWindowLoaded()

  // share the test static dat
  testStaticDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  testStaticDatURL = 'dat://' + testStaticDat.archive.key.toString('hex') + '/'

  // create a owned archive
  var res = await app.client.executeAsync((done) => {
    beaker.library.createArchive().then(done,done)
  })
  createdDatURL = res.value.url
  createdDatKey = createdDatURL.slice('dat://'.length)

  // open the default start page
  await app.client.windowByIndex(1)
  await app.client.waitForExist('.start-wrapper')
})
test.after.always('cleanup', async t => {
  console.log(JSON.stringify(await app.client.getMainProcessLogs(), null, 2))
  await app.stop()
})

// tests
//

test('library.add, library.remove', async t => {
  // register event listeners
  await app.client.execute(() => {
    window.stats = {
      adds: 0,
      removes: 0
    }
    window.beaker.library.addEventListener('added', event => {
      window.stats.adds++
    })
    window.beaker.library.addEventListener('removed', event => {
      window.stats.removes++
    })
  })

  // by url
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.add(url).then(done,done)
  }, createdDatURL)
  t.deepEqual(res.value.isSaved, true)
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.remove(url).then(done,done)
  }, createdDatURL)
  t.deepEqual(res.value.isSaved, false)

  // by key
  var res = await app.client.executeAsync((key, done) => {
    window.beaker.library.add(key).then(done,done)
  }, createdDatKey)
  t.deepEqual(res.value.isSaved, true)
  var res = await app.client.executeAsync((key, done) => {
    window.beaker.library.remove(key).then(done,done)
  }, createdDatKey)
  t.deepEqual(res.value.isSaved, false)
  
  // check stats
  var stats = await app.client.execute(() => { return window.stats })
  t.deepEqual(stats.value, {
    adds: 2,
    removes: 2
  })
})

test('library.list', async t => {
  // add the owned and unowned dats
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.add(url).then(done,done)
  }, createdDatURL)
  t.deepEqual(res.value.isSaved, true)
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.add(url).then(done,done)
  }, testStaticDatURL)

  // list all
  var res = await app.client.executeAsync((done) => {
    window.beaker.library.list().then(done,done)
  })
  var items = res.value
  t.deepEqual(items.length, 2)
  t.deepEqual(items[0].userSettings.isSaved, true)
  t.deepEqual(items[1].userSettings.isSaved, true)
  t.deepEqual(items.filter(i => i.isOwner).length, 1)

  // list owned
  var res = await app.client.executeAsync((done) => {
    window.beaker.library.list({ isOwner: true }).then(done,done)
  })
  t.deepEqual(res.value.length, 1)

  // list unowned
  var res = await app.client.executeAsync((done) => {
    window.beaker.library.list({ isOwner: false }).then(done,done)
  })
  t.deepEqual(res.value.length, 1)
})

test('library.get', async t => {
  // add the owned and remove the unowned dat
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.add(url).then(done,done)
  }, createdDatURL)
  t.deepEqual(res.value.isSaved, true)
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.remove(url).then(done,done)
  }, testStaticDatURL)

  // get owned by url
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.get(url).then(done,done)
  }, createdDatURL)
  t.deepEqual(res.value.isOwner, true)
  t.deepEqual(res.value.userSettings.isSaved, true)

  // get owned by key
  var res = await app.client.executeAsync((key, done) => {
    window.beaker.library.get(key).then(done,done)
  }, createdDatKey)
  t.deepEqual(res.value.isOwner, true)
  t.deepEqual(res.value.userSettings.isSaved, true)

  // get unowned by url
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.library.get(url).then(done,done)
  }, testStaticDatURL)
  t.deepEqual(res.value.isOwner, false)
  t.deepEqual(res.value.userSettings.isSaved, false)
})

test('library "updated" event', async t => {
  // register event listener
  await app.client.execute(() => {
    window.newTitle = false
    window.beaker.library.addEventListener('updated', event => {
      window.newTitle = event.details.title
    })
  })

  // update manifest
  var res = await app.client.executeAsync((url, done) => {
    beaker.library.updateArchiveManifest(url, { title: 'The New Title' }).then(done, done)
  }, createdDatURL)

  // need to sleep because there's a builtin delay to processing meta updates
  await sleep(1000)
  
  // check result
  var res = await app.client.execute(() => { return window.newTitle })
  t.deepEqual(res.value, 'The New Title')
})


function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}
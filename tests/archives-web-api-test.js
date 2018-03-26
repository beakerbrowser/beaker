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

test.before(async t => {
  await app.isReady

  // share the test static dat
  testStaticDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  testStaticDatURL = 'dat://' + testStaticDat.archive.key.toString('hex') + '/'

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

// TODO(profiles) disabled -prf
// test('publishing', async t => {
//   // publish by url
//   var res = await app.client.executeJavascript((url, done) => {
//     window.beaker.archives.publish(url)
//   }, createdDatURL)
//   var recordUrl = res
//   t.truthy(recordUrl.startsWith('dat://'))
//   var res = await app.client.executeJavascript((recordUrl, done) => {
//     window.beaker.archives.getPublishRecord(recordUrl)
//   }, recordUrl)
//   var cmp = {
//     _origin: res._origin,
//     _url: res._url,
//     createdAt: res.createdAt,
//     description: 'Is temporary',
//     id: res.id,
//     receivedAt: res.receivedAt,
//     title: 'Test Archive',
//     type: [ 'foo', 'bar' ],
//     url: createdDatURL,
//     votes: { currentUsersVote: 0, down: 0, up: 0, upVoters: [], value: 0 }
//   }
//   t.deepEqual(res, cmp)

//   // list
//   var res = await app.client.executeJavascript((done) => {
//     window.beaker.archives.listPublished({fetchAuthor: true, countVotes: true})
//   })
//   t.deepEqual(res, [
//     { _origin: res[0]._origin,
//     _url: res[0]._url,
//     createdAt: res[0].createdAt,
//     description: 'Is temporary',
//     id: res[0].id,
//     receivedAt: res[0].receivedAt,
//     title: 'Test Archive',
//     type: [ 'foo', 'bar' ],
//     url: createdDatURL,
//     votes: { currentUsersVote: 0, down: 0, up: 0, upVoters: [], value: 0 } }
//   ])

//   // unpublish by url
//   await app.client.executeJavascript((url, done) => {
//     window.beaker.archives.unpublish(url)
//   }, createdDatURL)
//   var res = await app.client.executeJavascript((recordUrl, done) => {
//     window.beaker.archives.getPublishRecord(recordUrl)
//   }, recordUrl)
//   t.falsy(res)

//   // publish/unpublish by archive
//   var res = await app.client.executeJavascript((url, done) => {
//     var archive = new DatArchive(url)
//     window.beaker.archives.publish(archive)
//   }, createdDatURL)
//   var recordUrl = res
//   t.truthy(recordUrl.startsWith('dat://'))
//   var res = await app.client.executeJavascript((recordUrl, done) => {
//     window.beaker.archives.getPublishRecord(recordUrl)
//   }, recordUrl)
//   t.deepEqual(res, {
//     _origin: res._origin,
//     _url: res._url,
//     createdAt: res.createdAt,
//     description: 'Is temporary',
//     id: res.id,
//     receivedAt: res.receivedAt,
//     title: 'Test Archive',
//     type: [ 'foo', 'bar' ],
//     url: createdDatURL,
//     votes: { currentUsersVote: 0, down: 0, up: 0, upVoters: [], value: 0 }
//   })
//   await app.client.executeJavascript((url, done) => {
//     var archive = new DatArchive(url)
//     window.beaker.archives.unpublish(archive)
//   }, createdDatURL)
//   var res = await app.client.executeJavascript((recordUrl, done) => {
//     window.beaker.archives.getPublishRecord(recordUrl)
//   }, recordUrl)
//   t.falsy(res)
// })

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

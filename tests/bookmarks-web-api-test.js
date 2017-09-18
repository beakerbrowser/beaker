import test from 'ava'
import {Application} from 'spectron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

const NUM_DEFAULT_BOOKMARKS = 10

const app = new Application({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
test.before(async t => {
  await app.start()
  await app.client.waitUntilWindowLoaded()

  // open the default start page
  await app.client.windowByIndex(1)
  await app.client.waitForExist('body > *')
})
test.after.always('cleanup', async t => {
  console.log(JSON.stringify(await app.client.getMainProcessLogs(), null, 2))
  await app.stop()
})

test('public bookmarks', async t => {

  // write some public bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.bookmarkPublic('dat://beakerbrowser.com/', {title: 'Beaker Browser', tags: ['tag1', 'tag2'], notes: 'Foo'}).then(done,done)
  })
  t.falsy(res.value)
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.bookmarkPublic('https://beakerbrowser.com/docs').then(done,done)
  })
  t.falsy(res.value)

  // read the bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.listPublicBookmarks().then(done,done)
  })
  res.value = res.value.map(bookmarkSubset)
  t.deepEqual(res.value, [
    { href: 'dat://beakerbrowser.com',
      id: 'dat!beakerbrowser.com',
      notes: 'Foo',
      pinned: false,
      private: false,
      tags: ['tag1', 'tag2'],
      title: 'Beaker Browser' },
    { href: 'https://beakerbrowser.com/docs',
      id: 'https!beakerbrowser.com!docs',
      notes: null,
      pinned: false,
      private: false,
      tags: [],
      title: null }
  ])

  // delete a bookmark
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.unbookmarkPublic('https://beakerbrowser.com/docs').then(done,done)
  })
  t.falsy(res.value)

  // read the bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.listPublicBookmarks().then(done,done)
  })
  res.value = res.value.map(bookmarkSubset)
  t.deepEqual(res.value, [
    { href: 'dat://beakerbrowser.com',
      id: 'dat!beakerbrowser.com',
      notes: 'Foo',
      pinned: false,
      private: false,
      tags: ['tag1', 'tag2'],
      title: 'Beaker Browser' }
  ])
})

test('private bookmarks', async t => {

  // write some private bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.bookmarkPrivate('https://bluelinklabs.com/', {title: 'Blue Link Labs', tags: ['tag1', 'tag2'], notes: 'Bar'}).then(done,done)
  })
  t.falsy(res.value)
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.bookmarkPrivate('https://nodevms.com/').then(done,done)
  })
  t.falsy(res.value)

  // read the bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.listPrivateBookmarks().then(done,done)
  })
  res.value.sort((a, b) => a.href.localeCompare(b.href))
  t.deepEqual(res.value.length, NUM_DEFAULT_BOOKMARKS + 2)
  var b = bookmarkSubset(res.value[0])
  t.deepEqual(b, {
    href: 'dat://pastedat-taravancil.hashbase.io',
    id: undefined,
    notes: null,
    pinned: true,
    tags: [],
    title: 'Pastedat',
    private: true
  })
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.getBookmark('https://bluelinklabs.com/').then(done,done)
  })
  var b = bookmarkSubset(res.value)
  t.deepEqual(b, {
    href: 'https://bluelinklabs.com',
    id: undefined,
    notes: 'Bar',
    pinned: false,
    tags: ['tag1', 'tag2'],
    title: 'Blue Link Labs',
    private: true
  })

  // make a partial update
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.bookmarkPrivate('https://bluelinklabs.com/', {tags: ['tag1'], notes: 'Baz'}).then(done,done)
  })
  t.falsy(res.value)
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.getBookmark('https://bluelinklabs.com/').then(done,done)
  })
  var b = bookmarkSubset(res.value)
  t.deepEqual(b, {
    href: 'https://bluelinklabs.com',
    id: undefined,
    notes: 'Baz',
    pinned: false,
    tags: ['tag1'],
    title: 'Blue Link Labs',
    private: true
  })

  // delete a bookmark
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.unbookmarkPrivate('https://nodevms.com/').then(done,done)
  })
  t.falsy(res.value)

  // read the bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.listPrivateBookmarks().then(done,done)
  })
  t.deepEqual(res.value.length, NUM_DEFAULT_BOOKMARKS + 1)
})

test('current user bookmarks', async t => {
  // get bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.getBookmark('dat://pastedat-taravancil.hashbase.io').then(done,done)
  })
  res.value = bookmarkSubset(res.value)
  t.deepEqual(res.value, {
    href: 'dat://pastedat-taravancil.hashbase.io',
    id: undefined,
    notes: null,
    pinned: true,
    tags: [],
    title: 'Pastedat',
    private: true
  })
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.getBookmark('dat://beakerbrowser.com/').then(done,done)
  })
  t.deepEqual(bookmarkSubset(res.value),
    { href: 'dat://beakerbrowser.com',
      id: 'dat!beakerbrowser.com',
      notes: 'Foo',
      pinned: false,
      private: false,
      tags: ['tag1', 'tag2'],
      title: 'Beaker Browser' }
  )
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.getBookmark('https://notabookmark.com/').then(done,() => done({error: true}))
  })
  t.deepEqual(res.value, null)

  // is bookmarked?
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.isBookmarked('dat://pastedat-taravancil.hashbase.io').then(done,done)
  })
  t.truthy(res.value)
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.isBookmarked('dat://beakerbrowser.com/').then(done,done)
  })
  t.truthy(res.value)
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.isBookmarked('https://notabookmark.com/').then(done,done)
  })
  t.falsy(res.value)
})

test('pinned bookmarks', async t => {

  // read the bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.listPinnedBookmarks().then(done,done)
  })
  res.value.sort((a, b) => a.href.localeCompare(b.href))
  t.deepEqual(res.value.length, NUM_DEFAULT_BOOKMARKS)
  t.deepEqual(bookmarkSubset(res.value[0]), {
    href: 'dat://pastedat-taravancil.hashbase.io',
    id: undefined,
    notes: null,
    pinned: true,
    tags: [],
    title: 'Pastedat',
    private: true
  })

  // pin a public bookmark
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.setBookmarkPinned('dat://beakerbrowser.com/', true).then(done,done)
  })
  t.falsy(res.value)

  // pin a private bookmark
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.setBookmarkPinned('https://bluelinklabs.com/', true).then(done,done)
  })
  t.falsy(res.value)

  // read the bookmarks
  var res = await app.client.executeAsync((done) => {
    window.beaker.bookmarks.listPinnedBookmarks().then(done,done)
  })
  res.value.sort((a, b) => a.href.localeCompare(b.href))
  t.deepEqual(res.value.length, NUM_DEFAULT_BOOKMARKS + 2)
})

function bookmarkSubset (b) {
  return {
    href: b.href,
    id: b.id,
    notes: b.notes,
    pinned: b.pinned,
    tags: b.tags,
    title: b.title,
    private: !!b.private
  }
}

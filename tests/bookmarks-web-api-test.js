import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

const NUM_DEFAULT_BOOKMARKS = 8

const app = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
test.before(async t => {
  console.log('starting bookmarks-web-api-test')
  await app.isReady
})
test.after.always('cleanup', async t => {
  await app.stop()
})

test('bookmarks', async t => {

  // write some private bookmarks
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.bookmarkPrivate('https://bluelinklabs.com/', {title: 'Blue Link Labs', tags: ['tag1', 'tag2'], notes: 'Bar'})
  `)
  t.falsy(res)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.bookmarkPrivate('https://nodevms.com/')
  `)
  t.falsy(res)

  // read the bookmarks
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.listPrivateBookmarks()
  `)
  res.sort((a, b) => a.href.localeCompare(b.href))
  t.deepEqual(res.length, NUM_DEFAULT_BOOKMARKS + 2)
  var b = bookmarkSubset(res[0])
  t.deepEqual(b, {
    href: 'dat://beakerbrowser.com',
    id: undefined,
    notes: null,
    pinned: true,
    tags: [],
    title: 'Beaker Home',
    private: true
  })
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.getBookmark('https://bluelinklabs.com/')
  `)
  var b = bookmarkSubset(res)
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
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.bookmarkPrivate('https://bluelinklabs.com/', {tags: ['tag1'], notes: 'Baz'})
  `)
  t.falsy(res)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.getBookmark('https://bluelinklabs.com/')
  `)
  var b = bookmarkSubset(res)
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
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.unbookmarkPrivate('https://nodevms.com/')
  `)
  t.falsy(res)

  // read the bookmarks
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.listPrivateBookmarks()
  `)
  t.deepEqual(res.length, NUM_DEFAULT_BOOKMARKS + 1)
})

test('current user bookmarks', async t => {
  // get bookmarks
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.getBookmark('dat://beakerbrowser.com')
  `)
  res = bookmarkSubset(res)
  t.deepEqual(res, {
    href: 'dat://beakerbrowser.com',
    id: undefined,
    notes: null,
    pinned: true,
    tags: [],
    title: 'Beaker Home',
    private: true
  })

  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.getBookmark('https://notabookmark.com/').catch(() => {throw 'error'})
  `)
  t.deepEqual(res, null)

  // is bookmarked?
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.isBookmarked('dat://beakerbrowser.com')
  `)
  t.truthy(res)
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.isBookmarked('https://notabookmark.com/')
  `)
  t.falsy(res)
})

test('pinned bookmarks', async t => {

  // read the bookmarks
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.listPinnedBookmarks()
  `)
  res.sort((a, b) => a.href.localeCompare(b.href))
  t.deepEqual(res.length, NUM_DEFAULT_BOOKMARKS)
  t.deepEqual(bookmarkSubset(res[0]), {
    href: 'dat://beakerbrowser.com',
    id: undefined,
    notes: null,
    pinned: true,
    tags: [],
    title: 'Beaker Home',
    private: true
  })

  // pin a private bookmark
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.setBookmarkPinned('https://bluelinklabs.com/', true)
  `)
  t.falsy(res)

  // read the bookmarks
  var res = await app.getTab(0).executeJavascript(`
    window.beaker.bookmarks.listPinnedBookmarks()
  `)
  res.sort((a, b) => a.href.localeCompare(b.href))
  t.deepEqual(res.length, NUM_DEFAULT_BOOKMARKS + 1)
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

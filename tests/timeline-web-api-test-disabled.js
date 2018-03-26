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

test('publishing posts/votes and reading', async t => {
  // read the user archive url
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentUserArchive().then(done, done)
  })
  const userArchiveURL = res.value.url

  // write some posts
  var res = await app.client.executeAsync((done) => {
    window.beaker.timeline.post({text: 'Hello, world!'}).then(done, done)
  })
  const post1Url = res.value
  t.truthy(res.value.startsWith('dat://'))
  var res = await app.client.executeAsync((done) => {
    window.beaker.timeline.post({text: 'Yay'}).then(done, done)
  })
  t.truthy(res.value.startsWith('dat://'))
  var res = await app.client.executeAsync((post1Url, done) => {
    window.beaker.timeline.post({text: 'Reply 1', threadParent: post1Url, threadRoot: post1Url}).then(done, done)
  }, post1Url)
  const reply1Url = res.value
  t.truthy(res.value.startsWith('dat://'))
  var res = await app.client.executeAsync((post1Url, reply1Url, done) => {
    window.beaker.timeline.post({text: 'Reply 2', threadParent: reply1Url, threadRoot: post1Url}).then(done, done)
  }, post1Url, reply1Url)
  t.truthy(res.value.startsWith('dat://'))

  // add some votes
  var res = await app.client.executeAsync((post1Url, done) => {
    window.beaker.timeline.vote(1, post1Url, 'post').then(done, done)
  }, post1Url)
  t.truthy(res.value.startsWith('dat://'))
  var res = await app.client.executeAsync((reply1Url, done) => {
    window.beaker.timeline.vote(-1, reply1Url, 'post').then(done, done)
  }, reply1Url)
  t.truthy(res.value.startsWith('dat://'))

  // list (toplevel) posts
  var res = await app.client.executeAsync((done) => {
    window.beaker.timeline.listPosts().then(done, done)
  })
  t.deepEqual(res.value.length, 4)
  t.deepEqual(res.value[0].text, 'Hello, world!')
  t.deepEqual(res.value[1].text, 'Yay')
  t.deepEqual(res.value[2].text, 'Reply 1')
  t.deepEqual(res.value[3].text, 'Reply 2')
  var res = await app.client.executeAsync((author, done) => {
    window.beaker.timeline.listPosts({author}).then(done, done)
  }, userArchiveURL)
  t.deepEqual(res.value.length, 4)
  t.deepEqual(res.value[0].text, 'Hello, world!')
  t.deepEqual(res.value[1].text, 'Yay')
  t.deepEqual(res.value[2].text, 'Reply 1')
  t.deepEqual(res.value[3].text, 'Reply 2')
  var res = await app.client.executeAsync((author, done) => {
    window.beaker.timeline.listPosts({author, reverse: true}).then(done, done)
  }, userArchiveURL)
  t.deepEqual(res.value.length, 4)
  t.deepEqual(res.value[0].text, 'Reply 2')
  t.deepEqual(res.value[1].text, 'Reply 1')
  t.deepEqual(res.value[2].text, 'Yay')
  t.deepEqual(res.value[3].text, 'Hello, world!')

  // count posts
  var res = await app.client.executeAsync((author, done) => {
    window.beaker.timeline.countPosts({author}).then(done,done)
  }, userArchiveURL)
  t.is(res.value, 4)

  // get thread
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.timeline.getPost(url).then(done,done)
  }, post1Url)
  var post = postSubset(res.value)
  t.deepEqual(post, {
    _origin: 'string',
    _url: 'string',
    createdAt: 'number',
    id: 'string',
    receivedAt: 'number',
    replies: [
      {
        _origin: 'string',
        _url: 'string',
        createdAt: 'number',
        id: 'string',
        receivedAt: 'number',
        replies: undefined,
        text: 'Reply 1',
        threadParent: 'string',
        threadRoot: 'string',
        votes: {
          currentUsersVote: -1,
          down: 1,
          up: 0,
          upVoters: [],
          value: -1
        }
      },
      {
        _origin: 'string',
        _url: 'string',
        createdAt: 'number',
        id: 'string',
        receivedAt: 'number',
        replies: undefined,
        text: 'Reply 2',
        threadParent: 'string',
        threadRoot: 'string',
        votes: {
          currentUsersVote: 0,
          down: 0,
          up: 0,
          upVoters: [],
          value: 0
        }
      }
    ],
    text: 'Hello, world!',
    threadParent: null,
    threadRoot: null,
    votes: {
      currentUsersVote: 1,
      down: 0,
      up: 1,
      upVoters: [userArchiveURL],
      value: 1
    }
  })
})

function postSubset (post) {
  return {
    _origin: typeof post._origin,
    _url: typeof post._url,
    createdAt: typeof post.createdAt,
    id: typeof post.id,
    receivedAt: typeof post.receivedAt,
    replies: post.replies ? post.replies.map(postSubset) : undefined,
    text: post.text,
    threadParent: post.threadParent ? typeof post.threadParent : null,
    threadRoot: post.threadRoot ? typeof post.threadRoot : null,
    votes: post.votes
  }
}
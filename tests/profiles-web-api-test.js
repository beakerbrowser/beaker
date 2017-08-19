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

test('profiles', async t => {

  // check current archive is set
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentArchive().then(done,done)
  })
  t.truthy(res.value.url)

  // check current profile is null
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentProfile().then(done,done)
  })
  t.falsy(res.value)

  // set current profile
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.setCurrentProfile({
      name: 'Alice',
      bio: 'Cool hacker girl'
    }).then(done,done)
  })
  t.falsy(res.value)

  // check current profile is set
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentProfile().then(done,done)
  })
  t.deepEqual(profileSubset(res.value), {
    avatar: null,
    bio: 'Cool hacker girl',
    followUrls: [],
    follows: [],
    name: 'Alice'
  })

})

test('avatars', async t => {
  // set current avatar
  var bufBase64 = fs.readFileSync('../app/assets/img/logo.png', 'base64')
  var res = await app.client.executeAsync((bufBase64, done) => {
    window.beaker.profiles.setCurrentAvatar(bufBase64, 'png').then(done,done)
  }, bufBase64)
  t.falsy(res.value)

  // check avatar is set
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentProfile().then(done,done)
  })
  t.deepEqual(profileSubset(res.value), {
    avatar: '/avatar.png',
    bio: 'Cool hacker girl',
    followUrls: [],
    follows: [],
    name: 'Alice'
  })
})

// test('following', async t => {
//   // follow: 'promise',
//   // unfollow: 'promise',
//   // listFollowers: 'promise',
//   // countFollowers: 'promise',
//   // listFriends: 'promise',
//   // countFriends: 'promise',
//   // isFollowing: 'promise',
//   // isFriendsWith: 'promise'
// })

function profileSubset (p) {
  return {
    avatar: p.avatar,
    bio: p.bio,
    followUrls: p.followUrls,
    follows: p.follows,
    name: p.name
  }
}
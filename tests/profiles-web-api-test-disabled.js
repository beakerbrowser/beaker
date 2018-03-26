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
    window.beaker.profiles.getCurrentUserArchive().then(done,done)
  })
  t.truthy(res.value.url)

  // check current profile is blank
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentUserProfile().then(done,done)
  })
  t.deepEqual(res.value, {avatar: false, bio: '', name: ''})

  // set current profile
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.setCurrentUserProfile({
      name: 'Alice',
      bio: 'Cool hacker girl'
    }).then(done,done)
  })
  t.falsy(res.value)

  // check current profile is set
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentUserProfile().then(done,done)
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
    window.beaker.profiles.setCurrentUserAvatar(bufBase64, 'png').then(done,done)
  }, bufBase64)
  t.falsy(res.value)

  // check avatar is set
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentUserProfile().then(done,done)
  })
  t.deepEqual(profileSubset(res.value), {
    avatar: '/avatar.png',
    bio: 'Cool hacker girl',
    followUrls: [],
    follows: [],
    name: 'Alice'
  })
})

test('following', async t => {
  // get alice's url
  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentUserArchive().then(done,done)
  })
  var aliceUrl = res.value.url
  t.truthy(aliceUrl.startsWith('dat://'))

  // create new users
  var res = await app.client.executeAsync((done) => {
    DatArchive.create().then(done,done)
  })
  var bobUrl = res.value.url
  t.truthy(bobUrl.startsWith('dat://'))
  var res = await app.client.executeAsync((done) => {
    DatArchive.create().then(done,done)
  })
  var carlaUrl = res.value.url
  t.truthy(carlaUrl.startsWith('dat://'))

  // follow
  var res = await app.client.executeAsync((bobUrl, done) => {
    window.beaker.profiles.follow(bobUrl, 'Robert').then(done,done)
  }, bobUrl)
  var res = await app.client.executeAsync((carlaUrl, done) => {
    window.beaker.profiles.follow(carlaUrl).then(done,done)
  }, carlaUrl)

  // set profiles manually
  var res = await app.client.executeAsync((url, done) => {
    const a = new DatArchive(url)
    a.writeFile('/profile.json', window.JSON.stringify({
      name: 'Bob',
      bio: 'Cool hacker guy'
    })).then(done,done)
  }, bobUrl)
  t.falsy(res.value)
  var res = await app.client.executeAsync((url, aliceUrl, done) => {
    const a = new DatArchive(url)
    a.writeFile('/profile.json', window.JSON.stringify({
      name: 'Carla',
      bio: 'Cool hacker girl',
      follows: [{url: aliceUrl}]
    })).then(done,done)
  }, carlaUrl, aliceUrl)
  t.falsy(res.value)

  // list followers
  var res = await app.client.executeAsync((aliceUrl, done) => {
    window.beaker.profiles.listFollowers(aliceUrl).then(done,done)
  }, aliceUrl)
  t.deepEqual(res.value.length, 1)
  res.value[0] = profileSubset(res.value[0])
  t.deepEqual(res.value[0], {
    avatar: null,
    bio: 'Cool hacker girl',
    followUrls: [ aliceUrl ],
    follows: [ { url: aliceUrl, name: null } ],
    name: 'Carla'
  })
  var res = await app.client.executeAsync((bobUrl, done) => {
    window.beaker.profiles.listFollowers(bobUrl).then(done,done)
  }, bobUrl)
  t.deepEqual(res.value.length, 1)
  res.value[0] = profileSubset(res.value[0])
  t.deepEqual(res.value[0], {
    avatar: '/avatar.png',
    bio: 'Cool hacker girl',
    followUrls: [ bobUrl, carlaUrl ].sort(),
    follows: [ { url: bobUrl, name: 'Robert' }, { url: carlaUrl, name: null } ].sort((a,b) => a.url.localeCompare(b.url)),
    name: 'Alice'
  })

  // count followers
  var res = await app.client.executeAsync((aliceUrl, done) => {
    window.beaker.profiles.countFollowers(aliceUrl).then(done,done)
  }, aliceUrl)
  t.deepEqual(res.value, 1)
  var res = await app.client.executeAsync((bobUrl, done) => {
    window.beaker.profiles.countFollowers(bobUrl).then(done,done)
  }, bobUrl)
  t.deepEqual(res.value, 1)

  // list friends
  var res = await app.client.executeAsync((aliceUrl, done) => {
    window.beaker.profiles.listFriends(aliceUrl).then(done,done)
  }, aliceUrl)
  t.deepEqual(res.value.length, 1)
  res.value[0] = profileSubset(res.value[0])
  t.deepEqual(res.value[0], {
    avatar: null,
    bio: 'Cool hacker girl',
    followUrls: [ aliceUrl ],
    follows: [ { url: aliceUrl, name: null } ],
    name: 'Carla'
  })
  var res = await app.client.executeAsync((bobUrl, done) => {
    window.beaker.profiles.listFriends(bobUrl).then(done,done)
  }, bobUrl)
  t.deepEqual(res.value.length, 0)

  // count friends
  var res = await app.client.executeAsync((aliceUrl, done) => {
    window.beaker.profiles.countFriends(aliceUrl).then(done,done)
  }, aliceUrl)
  t.deepEqual(res.value, 1)
  var res = await app.client.executeAsync((bobUrl, done) => {
    window.beaker.profiles.countFriends(bobUrl).then(done,done)
  }, bobUrl)
  t.deepEqual(res.value, 0)

  // is following
  var res = await app.client.executeAsync((aliceUrl, bobUrl, done) => {
    window.beaker.profiles.isFollowing(aliceUrl, bobUrl).then(done,done)
  }, aliceUrl, bobUrl)
  t.deepEqual(res.value, true)
  var res = await app.client.executeAsync((aliceUrl, bobUrl, done) => {
    window.beaker.profiles.isFollowing(bobUrl, aliceUrl).then(done,done)
  }, aliceUrl, bobUrl)
  t.deepEqual(res.value, false)

  // is friends with
  var res = await app.client.executeAsync((aliceUrl, bobUrl, done) => {
    window.beaker.profiles.isFriendsWith(aliceUrl, bobUrl).then(done,done)
  }, aliceUrl, bobUrl)
  t.deepEqual(res.value, false)
  var res = await app.client.executeAsync((aliceUrl, carlaUrl, done) => {
    window.beaker.profiles.isFriendsWith(aliceUrl, carlaUrl).then(done,done)
  }, aliceUrl, carlaUrl)
  t.deepEqual(res.value, true)

  // unfollow
  var res = await app.client.executeAsync((bobUrl, done) => {
    window.beaker.profiles.unfollow(bobUrl).then(done,done)
  }, bobUrl)
  var res = await app.client.executeAsync((aliceUrl, bobUrl, done) => {
    window.beaker.profiles.isFollowing(aliceUrl, bobUrl).then(done,done)
  }, aliceUrl, bobUrl)
  t.deepEqual(res.value, false)
})

function profileSubset (p) {
  return {
    avatar: p.avatar,
    bio: p.bio,
    followUrls: p.followUrls.sort(),
    follows: p.follows.sort((a,b) => a.url.localeCompare(b.url)),
    name: p.name
  }
}
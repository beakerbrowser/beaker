import test from 'ava'
import {Application} from 'spectron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {shareDat} from './lib/dat-helpers'

const app = new Application({
  path: electron,
  args: ['../app'],
  env: { 
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'),
    beaker_dat_quota_default_bytes_allowed: 1024 * 10 // 10kb
  }
})
var testRunnerDat, testRunnerDatURL
var profileDatURLs = []

test.before(async t => {
  // open the window
  await app.start()
  await app.client.waitUntilWindowLoaded()

  // share the test runner dat
  testRunnerDat = await shareDat(__dirname + '/scaffold/test-profiles-dat')
  testRunnerDatURL = 'dat://' + testRunnerDat.archive.key.toString('hex') + '/'

  // create a 3 owned archives
  for (var i = 0; i < 3; i++) {
    let res = await app.client.executeAsync((done) => {
      beaker.archives.create().then(done,done)
    })
    profileDatURLs.push(res.value.url)
  }

  // open the runner
  await browserdriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded')

  // get write permissions on all profile sites
  for (var i = 0; i < profileDatURLs.length; i++) {
    // start the prompt
    await app.client.execute(url => {
      // put the result on the window, for checking later
      var archive = new DatArchive(url)
      archive.writeFile('/allowthis.txt', 'hello world', 'utf8').then(
        res => window.res = res,
        err => window.res = err
      )
    }, profileDatURLs[i])

    // accept the prompt
    await app.client.windowByIndex(0)
    await app.client.click('.prompt-accept')
    await app.client.windowByIndex(1)
  }
})
test.after.always('cleanup', async t => {
  console.log(JSON.stringify(await app.client.getMainProcessLogs(), null, 2))
  await app.stop()
})

// tests
//

test('setProfile, getProfile', async t => {
  var res

  // set profile
  res = await app.client.executeAsync((url, done) => {
    window.mainProfile = new DatProfileSite(url)
    mainProfile.setProfile({
      name: 'foo',
      description: 'bar',
      image: '/baz.png'
    }).then(done, done)
  }, profileDatURLs[0])

  // get profile
  res = await app.client.executeAsync((done) => {
    mainProfile.getProfile().then(done, done)
  })
  t.deepEqual(res.value.name, 'foo')
  t.deepEqual(res.value.description, 'bar')
  t.deepEqual(res.value.image, '/baz.png')

  // update profile
  res = await app.client.executeAsync((done) => {
    mainProfile.setProfile({name: 'FOO'}).then(done, done)
  })

  // get profile
  res = await app.client.executeAsync((done) => {
    mainProfile.getProfile().then(done, done)
  })
  t.deepEqual(res.value.name, 'FOO')
  t.deepEqual(res.value.description, 'bar')
  t.deepEqual(res.value.image, '/baz.png')
})

test('follow, unfollow', async t => {
  var res

  // follow
  res = await app.client.executeAsync((url, done) => {
    mainProfile.follow(url).then(done, done)
  }, profileDatURLs[1])

  // get profile
  res = await app.client.executeAsync((done) => {
    mainProfile.getProfile().then(done, done)
  })
  t.deepEqual(res.value.follows, [{url: profileDatURLs[1]}])

  // follow
  res = await app.client.executeAsync((url, done) => {
    mainProfile.follow(url).then(done, done)
  }, profileDatURLs[2])

  // get profile
  res = await app.client.executeAsync((done) => {
    mainProfile.getProfile().then(done, done)
  })
  t.deepEqual(res.value.follows, [{url: profileDatURLs[1]}, {url: profileDatURLs[2]}])

  // unfollow
  res = await app.client.executeAsync((url, done) => {
    mainProfile.unfollow(url).then(done, done)
  }, profileDatURLs[1])

  // get profile
  res = await app.client.executeAsync((done) => {
    mainProfile.getProfile().then(done, done)
  })
  t.deepEqual(res.value.follows, [{url: profileDatURLs[2]}])

  // refollow
  res = await app.client.executeAsync((url, done) => {
    mainProfile.follow(url).then(done, done)
  }, profileDatURLs[1])

  // get profile
  res = await app.client.executeAsync((done) => {
    mainProfile.getProfile().then(done, done)
  })
  t.deepEqual(res.value.follows, [{url: profileDatURLs[2]}, {url: profileDatURLs[1]}])
})

test('listFollowing', async t => {
  var res

  // set a profile for one of the others
  res = await app.client.executeAsync((url, done) => {
    window.secondProfile = new DatProfileSite(url)
    secondProfile.setProfile({
      name: 'alice',
      description: 'second profile'
    }).then(done, done)
  }, profileDatURLs[1])

  // list following
  res = await app.client.executeAsync((done) => {
    mainProfile.listFollowing().then(done, done)
  })
  t.deepEqual(res.value, [
    {url: profileDatURLs[2], downloaded: true},
    {url: profileDatURLs[1], name: 'alice', description: 'second profile', downloaded: true}
  ])
})

test('listFollowing with an undownloadable follow', async t => {
  var res
  const BAD_URL = ('dat://' + 'f'.repeat(64))

  // follow a bad URL
  res = await app.client.executeAsync((url, done) => {
    mainProfile.follow(url).then(done, done)
  }, BAD_URL)

  // list following
  res = await app.client.executeAsync((done) => {
    mainProfile.listFollowing({timeout: 50}).then(done, done)
  })
  t.deepEqual(res.value, [
    {url: profileDatURLs[2], downloaded: true},
    {url: profileDatURLs[1], name: 'alice', description: 'second profile', downloaded: true},
    {url: BAD_URL, downloaded: false}
  ])
})

test('listFriends', async t => {
  var res

  // create a friendship
  res = await app.client.executeAsync((url, done) => {
    secondProfile.follow(url).then(done, done)
  }, profileDatURLs[0])

  // list friends
  res = await app.client.executeAsync((done) => {
    mainProfile.listFriends({timeout: 50}).then(done, done)
  })
  t.deepEqual(res.value.length, 1)
  t.deepEqual(res.value[0].name, 'alice')
})

test('broadcast', async t => {
  var res

  // text-only post
  res = await app.client.executeAsync((done) => {
    mainProfile.broadcast({
      text: 'Hello world'
    }).then(done, done)
  })
  t.truthy(typeof res.value === 'string')
  t.truthy(res.value.startsWith('dat://'))
  var path = res.value.slice(profileDatURLs[0].length)

  // read back
  res = await app.client.executeAsync((path, done) => {
    mainProfile.getBroadcast(path).then(entry => {
      delete entry.length // gotta remove this attr or webdriver interprets as an array
      return entry
    }).then(done,done)
  }, path)
  t.truthy(res.value.mtime)
  t.truthy(res.value.name)
  t.deepEqual(res.value.content['@type'], 'Comment')
  t.deepEqual(res.value.content.text, 'Hello world')

  // 1 image posts
  res = await app.client.executeAsync((done) => {
    mainProfile.broadcast({
      text: '1 image post',
      image: '/foo.png'
    }).then(done, done)
  })
  t.truthy(typeof res.value === 'string')
  t.truthy(res.value.startsWith('dat://'))
  var path = res.value.slice(profileDatURLs[0].length)

  // read back
  res = await app.client.executeAsync((path, done) => {
    mainProfile.getBroadcast(path).then(entry => {
      delete entry.length // gotta remove this attr or webdriver interprets as an array
      return entry
    }).then(done,done)
  }, path)
  t.truthy(res.value.mtime)
  t.truthy(res.value.name)
  t.deepEqual(res.value.content['@type'], 'Comment')
  t.deepEqual(res.value.content.text, '1 image post')
  t.deepEqual(res.value.content.image, '/foo.png')

  // 3 image posts
  res = await app.client.executeAsync((done) => {
    mainProfile.broadcast({
      text: '3 image post',
      image: ['/foo.png', '/bar.png', '/baz.png']
    }).then(done, done)
  })
  t.truthy(typeof res.value === 'string')
  t.truthy(res.value.startsWith('dat://'))
  var path = res.value.slice(profileDatURLs[0].length)

  // read back
  res = await app.client.executeAsync((path, done) => {
    mainProfile.getBroadcast(path).then(entry => {
      delete entry.length // gotta remove this attr or webdriver interprets as an array
      return entry
    }).then(done,done)
  }, path)
  t.truthy(res.value.mtime)
  t.truthy(res.value.name)
  t.deepEqual(res.value.content['@type'], 'Comment')
  t.deepEqual(res.value.content.text, '3 image post')
  t.deepEqual(res.value.content.image, ['/foo.png', '/bar.png', '/baz.png'])
})

test('listBroadcasts', async t => {
  var res

  // list broadcasts
  res = await app.client.executeAsync((done) => {
    mainProfile.listBroadcasts({}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 3)
  t.deepEqual(res.value[0].content.text, 'Hello world')
  t.deepEqual(res.value[1].content.text, '1 image post')
  t.deepEqual(res.value[2].content.text, '3 image post')

  // reversed
  res = await app.client.executeAsync((done) => {
    mainProfile.listBroadcasts({reverse: true}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 3)
  t.deepEqual(res.value[0].content.text, '3 image post')
  t.deepEqual(res.value[1].content.text, '1 image post')
  t.deepEqual(res.value[2].content.text, 'Hello world')

  // limit
  res = await app.client.executeAsync((done) => {
    mainProfile.listBroadcasts({limit: 1}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 1)
  t.deepEqual(res.value[0].content.text, 'Hello world')

  var publishTime = +(/([\d]+)\.json$/i.exec(res.value[0].name)[1])

  // after
  res = await app.client.executeAsync((publishTime, done) => {
    mainProfile.listBroadcasts({after: publishTime}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  }, publishTime)
  t.deepEqual(res.value.length, 2)
  t.deepEqual(res.value[0].content.text, '1 image post')
  t.deepEqual(res.value[1].content.text, '3 image post')

  // after, reversed
  res = await app.client.executeAsync((publishTime, done) => {
    mainProfile.listBroadcasts({after: publishTime, reverse: true}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  }, publishTime)
  t.deepEqual(res.value.length, 2)
  t.deepEqual(res.value[0].content.text, '3 image post')
  t.deepEqual(res.value[1].content.text, '1 image post')

  // before
  res = await app.client.executeAsync((publishTime, done) => {
    mainProfile.listBroadcasts({before: publishTime}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  }, publishTime + 1)
  t.deepEqual(res.value.length, 1)
  t.deepEqual(res.value[0].content.text, 'Hello world')

  // meta only
  res = await app.client.executeAsync((done) => {
    mainProfile.listBroadcasts({metaOnly: true}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 3)
  t.falsy(res.value[0].content.text)
  t.falsy(res.value[1].content.text)
  t.falsy(res.value[2].content.text)
})

test('listFeed', async t => {
  var res

  // add some other broadcasts
  res = await app.client.executeAsync((done) => {
    secondProfile.broadcast({
      text: 'New post 1'
    }).then(done, done)
  })
  t.truthy(typeof res.value === 'string')
  t.truthy(res.value.startsWith('dat://'))

  res = await app.client.executeAsync((done) => {
    mainProfile.broadcast({
      text: 'New post 2'
    }).then(done, done)
  })
  t.truthy(typeof res.value === 'string')
  t.truthy(res.value.startsWith('dat://'))

  // list feed
  res = await app.client.executeAsync((done) => {
    mainProfile.listFeed({timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 5)
  t.deepEqual(res.value[0].content.text, 'Hello world')
  t.deepEqual(res.value[1].content.text, '1 image post')
  t.deepEqual(res.value[2].content.text, '3 image post')
  t.deepEqual(res.value[3].content.text, 'New post 1')
  t.deepEqual(res.value[4].content.text, 'New post 2')

  // reversed
  res = await app.client.executeAsync((done) => {
    mainProfile.listFeed({reverse: true, timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 5)
  t.deepEqual(res.value[0].content.text, 'New post 2')
  t.deepEqual(res.value[1].content.text, 'New post 1')
  t.deepEqual(res.value[2].content.text, '3 image post')
  t.deepEqual(res.value[3].content.text, '1 image post')
  t.deepEqual(res.value[4].content.text, 'Hello world')

  // limit
  res = await app.client.executeAsync((done) => {
    mainProfile.listFeed({limit: 1, timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 1)
  t.deepEqual(res.value[0].content.text, 'Hello world')

  var publishTime = +(/([\d]+)\.json$/i.exec(res.value[0].name)[1])

  // after
  res = await app.client.executeAsync((publishTime, done) => {
    mainProfile.listFeed({after: publishTime, timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  }, publishTime)
  t.deepEqual(res.value.length, 4)
  t.deepEqual(res.value[0].content.text, '1 image post')
  t.deepEqual(res.value[1].content.text, '3 image post')
  t.deepEqual(res.value[2].content.text, 'New post 1')
  t.deepEqual(res.value[3].content.text, 'New post 2')

  // after, reversed
  res = await app.client.executeAsync((publishTime, done) => {
    mainProfile.listFeed({after: publishTime, reverse: true, timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  }, publishTime)
  t.deepEqual(res.value.length, 4)
  t.deepEqual(res.value[0].content.text, 'New post 2')
  t.deepEqual(res.value[1].content.text, 'New post 1')
  t.deepEqual(res.value[2].content.text, '3 image post')
  t.deepEqual(res.value[3].content.text, '1 image post')

  // before
  res = await app.client.executeAsync((publishTime, done) => {
    mainProfile.listFeed({before: publishTime, timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  }, publishTime + 1)
  t.deepEqual(res.value.length, 1)
  t.deepEqual(res.value[0].content.text, 'Hello world')

  // meta only
  res = await app.client.executeAsync((done) => {
    mainProfile.listFeed({metaOnly: true, timeout: 50}).then(entries => {
      entries.forEach(entry => {      
        delete entry.length // gotta remove this attr or webdriver interprets as an array
      })
      return entries
    }).then(done, done)
  })
  t.deepEqual(res.value.length, 5)
  t.falsy(res.value[0].content.text)
  t.falsy(res.value[1].content.text)
  t.falsy(res.value[2].content.text)
  t.falsy(res.value[3].content.text)
  t.falsy(res.value[4].content.text)
})

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

test('publishing a post', async t => {
  // write a post
  console.log('hit')
  var res = await app.client.executeAsync((done) => {
    var dateStr = Date.now()
    window.beaker.timeline.post(dateStr).then(done, done)
  })
  console.log(res.value)
  t.truthy(res.value.startsWith('dat://'))


  var res = await app.client.executeAsync((done) => {
    window.beaker.profiles.getCurrentArchive().then(done, done)
  })
  var userArchive = res.value

  var res = await app.client.executeAsync((done) => {
    window.beaker.timeline.listPosts(userArchive).then(done, done)
  })
  console.log('posts', res.value)
  // TODO check that the post = dateStr

  // add another post, and check that countPosts works
  var res = await app.client.executeAsync((done) => {
    var dateStr2 = Date.now()
    window.beaker.timeline.post(dateStr).then(done, done)
  })
  t.falsy(res.value)

  var res = await app.client.executeAsync((done) => {
    window.beaker.timeline.countPosts({author: userArchive})
  })
  t.is(res.value, 2)
})

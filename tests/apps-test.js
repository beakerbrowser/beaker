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
var testRunnerDat, testRunnerDatURL

test.before(async t => {
  // open the window
  await app.start()
  await app.client.waitUntilWindowLoaded(20e3)

  // share the test runner dat
  testRunnerDat = await shareDat(__dirname + '/scaffold/test-runner-dat')
  testRunnerDatURL = 'dat://' + testRunnerDat.archive.key.toString('hex') + '/'

  // open the default start page
  await app.client.windowByIndex(1)
  await app.client.waitForExist('body > *')
})
test.after.always('cleanup', async t => {
  console.log(JSON.stringify(await app.client.getMainProcessLogs(), null, 2))
  await app.stop()
})

test('bind an app to a dat', async t => {
  // bind
  await app.client.windowByIndex(0)
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.apps.bind(0, 'test-dat-binding', url).then(done, done)
  }, testRunnerDatURL)

  // open app
  await browserdriver.navigateTo(app, 'app://test-dat-binding')
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded', 10e3)
})

test('bind an app to a file path', async t => {
  // bind
  await app.client.windowByIndex(0)
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.apps.bind(0, 'test-files-binding', url).then(done, done)
  }, 'file://' + __dirname + '/scaffold/test-runner-dat')

  // open app
  await browserdriver.navigateTo(app, 'app://test-files-binding')
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded', 10e3)
})

test('install flow', async t => {
  // start install flow
  await app.client.windowByIndex(0)
  var res = await app.client.execute((url, done) => {
    window.res = 'running...'
    window.beaker.apps.runInstaller(0, url).then(
      res => window.res = res,
      err => window.res = err
    )
  }, testRunnerDatURL)

  // move through flow
  await app.client.pause(500)
  await app.client.windowByIndex(2)
  await app.client.waitUntilWindowLoaded()
  await app.client.waitForExist('button[type="submit"]')
  await app.client.click('button[type="submit"]')
  await app.client.pause(50)
  await app.client.click('button[type="submit"]')
  await app.client.pause(50)
  await app.client.click('button[type="submit"]')

  // fetch & test the res
  await app.client.windowByIndex(0)
  await app.client.pause(100)
  await app.client.waitUntil(() => app.client.execute(() => { return window.res !== 'running...' }), 5e3)
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value, {
    name: 'test-app',
    permissions: {      
      profiles: ['read', 'edit-profile', 'edit-social'],
      bookmarks: ['read', 'edit-private', 'edit-public'],
      timeline: ['post', 'vote']
    }
  })

  // open app
  await browserdriver.navigateTo(app, 'app://test-app')
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded', 10e3)
})

test('configure flow', async t => {
  // start configure flow
  await app.client.windowByIndex(0)
  var res = await app.client.execute((url, done) => {
    window.res = 'running...'
    window.beaker.apps.runInstaller(0, url).then(
      res => window.res = res,
      err => window.res = err
    )
  }, testRunnerDatURL)

  // move through flow
  await app.client.pause(500)
  await app.client.windowByIndex(2)
  await app.client.waitUntilWindowLoaded()
  await app.client.waitForExist('button[type="submit"]')
  await app.client.click('button[type="submit"]')
  await app.client.pause(50)
  // uncheck all perms
  await app.client.click('input[name="profiles:read"]')
  await app.client.click('input[name="profiles:edit-profile"]')
  await app.client.click('input[name="profiles:edit-social"]')
  await app.client.click('input[name="bookmarks:read"]')
  await app.client.click('input[name="bookmarks:edit-private"]')
  await app.client.click('input[name="bookmarks:edit-public"]')
  await app.client.click('input[name="timeline:post"]')
  await app.client.click('input[name="timeline:vote"]')
  await app.client.click('button[type="submit"]')
  await app.client.pause(50)
  // change the name
  await app.client.click('input[value="custom"]')
  await app.client.waitForExist('input[type="text"]')
  await app.client.setValue('input[type="text"]', 'test-app-reconfigured')
  await app.client.click('input[value="custom"]') // click this to blur the input and fire the change event
  await app.client.click('button[type="submit"]')
  await app.client.pause(500)

  // fetch & test the res
  await app.client.windowByIndex(0)
  await app.client.waitUntil(() => app.client.execute(() => { return window.res !== 'running...' }), 5e3)
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value, {
    name: 'test-app-reconfigured',
    permissions: {      
      profiles: [],
      bookmarks: [],
      timeline: []
    }
  })

  // open app
  await browserdriver.navigateTo(app, 'app://test-app-reconfigured')
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded', 10e3)
})

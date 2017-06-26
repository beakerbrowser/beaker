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
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
test.before(async t => {
  await app.start()
  await app.client.waitUntilWindowLoaded()
})
test.after.always('cleanup', async t => await app.stop())

test('window loaded', async t => t.true(await app.browserWindow.isVisible()))
test('can open http pages', async t => {
  var tabIndex = await browserdriver.newTab(app)
  await browserdriver.navigateTo(app, 'http://example.com/')
  await app.client.windowByIndex(tabIndex)
  await app.client.waitForExist('h1')
  t.deepEqual(await app.client.getUrl(), 'http://example.com/')
})
test('can open https pages', async t => {
  var tabIndex = await browserdriver.newTab(app)
  await browserdriver.navigateTo(app, 'https://example.com/')
  await app.client.windowByIndex(tabIndex)
  await app.client.waitForExist('h1')
  t.deepEqual(await app.client.getUrl(), 'https://example.com/')
})
test('can open dat pages', async t => {
  var dat = await shareDat(__dirname + '/scaffold/test-runner-dat')
  var datUrl = 'dat://' + dat.archive.key.toString('hex') + '/'
  var tabIndex = await browserdriver.newTab(app)
  await browserdriver.navigateTo(app, datUrl)
  await app.client.windowByIndex(tabIndex)
  await app.client.waitForExist('h1#loaded')
  t.deepEqual(await app.client.getUrl(), datUrl)
})

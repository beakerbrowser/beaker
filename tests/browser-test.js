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
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
test.before(async t => {
  console.log('starting browser-test')
  await app.isReady
})
test.after.always('cleanup', async t => await app.stop())

test('can open http pages', async t => {
  var tab = await app.newTab()
  await tab.navigateTo('http://example.com/')
  t.truthy(await tab.doesExist('h1'))
  t.deepEqual(await tab.getUrl(), 'http://example.com/')
})
test('can open https pages', async t => {
  var tab = await app.newTab()
  await tab.navigateTo('https://example.com/')
  t.truthy(await tab.doesExist('h1'))
  t.deepEqual(await tab.getUrl(), 'https://example.com/')
})
test('can open dat pages', async t => {
  var dat = await shareDat(__dirname + '/scaffold/test-runner-dat')
  var datUrl = 'dat://' + dat.archive.key.toString('hex') + '/'
  var tab = await app.newTab()
  await tab.navigateTo(datUrl)
  t.truthy(await tab.doesExist('h1#loaded'))
  t.deepEqual(await tab.getUrl(), datUrl)
})

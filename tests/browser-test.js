import test from 'ava'
import {Application} from 'spectron'
import electron from '../node_modules/electron'

import * as browserActions from './lib/browser-actions'

const app = new Application({
  path: electron,
  args: ['../app']
})
test.before(async t => {
  await app.start()
  await app.client.waitUntilWindowLoaded()
})
test.after.always('cleanup', async t => await app.stop())

test('window loaded', async t => t.true(await app.browserWindow.isVisible()))
test('can open http pages', async t => {
  var tabIndex = await browserActions.newTab(app)
  console.log('tabIndex', tabIndex)
  await browserActions.navigateTo(app, 'http://example.com')
  await app.client.windowByIndex(tabIndex)
  await app.client.waitForExist('h1')
  t.deepEqual(await app.client.getUrl(), 'http://example.com/')
})
test('can open https pages', async t => {
  var tabIndex = await browserActions.newTab(app)
  await browserActions.navigateTo(app, 'https://example.com')
  await app.client.windowByIndex(tabIndex)
  await app.client.waitForExist('h1')
  t.deepEqual(await app.client.getUrl(), 'https://example.com/')
})

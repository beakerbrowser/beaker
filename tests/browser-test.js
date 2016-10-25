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
test('can open https pages', async t => {
  await browserActions.navigateTo(app, 'https://beakerbrowser.com')
  await app.client.windowByIndex(1)
  await app.client.waitForExist('.hero')
  t.deepEqual(await app.client.getUrl(), 'https://beakerbrowser.com/')
})

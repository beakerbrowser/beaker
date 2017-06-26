import test from 'ava'
import {Application} from 'spectron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserDriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

const app = new Application({
  path: electron,
  args: ['../app'],
  env: { 
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
var testRunnerDat, testRunnerDatURL

test.before(async t => {
  // open the window
  await app.start()

  // share the test runner dat
  testRunnerDat = await shareDat(__dirname + '/scaffold/test-runner-dat')
  testRunnerDatURL = 'dat://' + testRunnerDat.archive.key.toString('hex') + '/'

  // open the test-runner dat
  await browserDriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded')
})
test.after.always('cleanup', async t => {
  console.log(await app.client.getMainProcessLogs())
  await app.stop()
})

// reusable test
//

function testCorsAjax () {
  return app.client.executeAsync(done => {
    fetch('https://cors-test.appspot.com/test').then(
      () => done('success'),
      () => done('failure')
    )
  })
}

// tests
//

test('default no network permissions', async t => {
  var res = await testCorsAjax()
  t.deepEqual(res.value, 'failure')
})

test('reject, navigator.permissions.request (network cors-test.appspot.com)', async t => {
  // start the prompt
  await app.client.execute(() => {
    // put the result on the window, for checking later
    window.res = null
    navigator.permissions.request({ name: 'network', hostname: 'cors-test.appspot.com' }).then(
      res => window.res = res,
      err => window.res = err
    )
  })

  // reject the prompt
  await app.client.windowByIndex(0)
  await app.client.click('.prompt-reject')
  await app.client.windowByIndex(1)

  // fetch & test the res
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.state, 'denied')

  // test the fetch
  var res = await testCorsAjax()
  t.deepEqual(res.value, 'failure')
})

test('accept, navigator.permissions.request (network cors-test.appspot.com)', async t => {
  // start the prompt
  await app.client.execute(() => {
    // put the result on the window, for checking later
    window.res = null
    navigator.permissions.request({ name: 'network', hostname: 'cors-test.appspot.com' }).then(
      res => window.res = res,
      err => window.res = err
    )
  })

  // accept the prompt
  await app.client.windowByIndex(0)
  await app.client.click('.prompt-accept')
  await app.client.windowByIndex(1)

  // fetch & test the res
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.state, 'granted')

  // load the page in a new tab, so the change can take effect
  var index = await browserDriver.newTab(app)
  await browserDriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(index)

  // test the fetch
  var res = await testCorsAjax()
  t.deepEqual(res.value, 'success')
})

test('navigator.permissions.query (network cors-test.appspot.com)', async t => {
  // check state
  var res = await app.client.executeAsync(done => {
    navigator.permissions.query({ name: 'network', hostname: 'cors-test.appspot.com' }).then(done, done)
  })
  t.deepEqual(res.value.state, 'granted')
})

test('navigator.permissions.revoke (network cors-test.appspot.com)', async t => {
  // revoke
  var res = await app.client.executeAsync(done => {
    navigator.permissions.revoke({ name: 'network', hostname: 'cors-test.appspot.com' }).then(done, done)
  })
  t.deepEqual(res.value.state, 'prompt')

  // load the page in a new tab, so the change can take effect
  var index = await browserDriver.newTab(app)
  await browserDriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(index)

  var res = await testCorsAjax()
  t.deepEqual(res.value, 'failure')
})

test('accept, navigator.permissions.request (network *)', async t => {
  // start the prompt
  await app.client.execute(() => {
    // put the result on the window, for checking later
    window.res = null
    navigator.permissions.request({ name: 'network', hostname: '*' }).then(
      res => window.res = res,
      err => window.res = err
    )
  })

  // accept the prompt
  await app.client.windowByIndex(0)
  await app.client.click('.prompt-accept')
  await app.client.windowByIndex(1)

  // fetch & test the res
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.state, 'granted')

  // load the page in a new tab, so the change can take effect
  var index = await browserDriver.newTab(app)
  await browserDriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(index)

  // test the fetch
  var res = await testCorsAjax()
  t.deepEqual(res.value, 'success')
})

test('navigator.permissions.query (network *)', async t => {
  // check state
  var res = await app.client.executeAsync(done => {
    navigator.permissions.query({ name: 'network', hostname: '*' }).then(done, done)
  })
  t.deepEqual(res.value.state, 'granted')
})

test('navigator.permissions.revoke (network *)', async t => {
  // revoke
  var res = await app.client.executeAsync(done => {
    navigator.permissions.revoke({ name: 'network', hostname: '*' }).then(done, done)
  })
  t.deepEqual(res.value.state, 'prompt')

  // load the page in a new tab, so the change can take effect
  var index = await browserDriver.newTab(app)
  await browserDriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(index)

  var res = await testCorsAjax()
  t.deepEqual(res.value, 'failure')
})


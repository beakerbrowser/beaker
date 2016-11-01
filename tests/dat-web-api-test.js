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
  env: { beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-') }
})
var testStaticDat, testStaticDatURL
var testRunnerDat, testRunnerDatURL

test.before(async t => {
  // open the window
  await app.start()
  await app.client.waitUntilWindowLoaded()

  // share the test static dat
  testStaticDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  testStaticDatURL = 'dat://' + testStaticDat.archive.key.toString('hex') + '/'

  // share the test runner dat
  testRunnerDat = await shareDat(__dirname + '/scaffold/test-runner-dat')
  testRunnerDatURL = 'dat://' + testRunnerDat.archive.key.toString('hex') + '/'

  // open the test-runner dat
  await browserdriver.navigateTo(app, testRunnerDatURL)
  await app.client.windowByIndex(1)
  await app.client.waitForExist('h1#loaded')
})
test.after.always('cleanup', async t => await app.stop())

test('dat.readDirectory', async t => {
  async function readDirectory (url, opts) {
    return app.client.executeAsync((url, opts, done) => {
      dat.readDirectory(url, opts).then(done, done)
    }, url, opts || null)
  }

  // root dir
  let listing1 = await readDirectory(testStaticDatURL)
  t.deepEqual(Object.keys(listing1.value).sort(), ['beaker.png', 'hello.txt', 'subdir'])

  // subdir
  let listing2 = await readDirectory(testStaticDatURL + 'subdir')
  t.deepEqual(Object.keys(listing2.value).sort(), ['hello.txt'])
})

test('dat.readFile', async t => {
  async function readFile (url, opts) {
    return app.client.executeAsync((url, opts, done) => {
      dat.readFile(url, opts).then(done, done)
    }, url, opts)
  }

  var beakerPng = fs.readFileSync(__dirname + '/scaffold/test-static-dat/beaker.png')

  // read utf8
  var helloTxt = await readFile(testStaticDatURL + 'hello.txt', {})
  t.deepEqual(helloTxt.value, 'hello')

  // read utf8 2
  var helloTxt2 = await readFile(testStaticDatURL + 'subdir/hello.txt', 'utf8')
  t.deepEqual(helloTxt2.value, 'hi')

  // read hex
  var beakerPngHex = await readFile(testStaticDatURL + 'beaker.png', 'hex')
  t.deepEqual(beakerPngHex.value, beakerPng.toString('hex'))

  // read hex
  var beakerPngBase64 = await readFile(testStaticDatURL + 'beaker.png', 'base64')
  t.deepEqual(beakerPngBase64.value, beakerPng.toString('base64'))
})

test('dat.stat', async t => {
  async function stat (url, opts) {
    var res = await app.client.executeAsync((url, opts, done) => {
      dat.stat(url, opts).then(v => done(stringify(v)), done)
    }, url, opts)
    if (typeof res.value === 'string')
      res.value = JSON.parse(res.value)
    return res
  }

  // stat root file
  var entry = await stat(testStaticDatURL + 'hello.txt', {})
  t.deepEqual(entry.value.name, 'hello.txt')
  t.deepEqual(entry.value.type, 'file')

  // stat subdir file
  var entry = await stat(testStaticDatURL + 'subdir/hello.txt', {})
  t.deepEqual(entry.value.name, 'subdir/hello.txt')
  t.deepEqual(entry.value.type, 'file')

  // stat subdir
  var entry = await stat(testStaticDatURL + 'subdir', {})
  t.deepEqual(entry.value.name, 'subdir')
  t.deepEqual(entry.value.type, 'directory')
})


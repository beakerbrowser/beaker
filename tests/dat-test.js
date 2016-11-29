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
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
var createdDatKey, createdDatURL

test.before(async t => {
  // open the window
  await app.start()
  await app.client.waitUntilWindowLoaded()
  await app.client.windowByIndex(0)
})
test.after.always('cleanup', async t => {
  console.log(await app.client.getMainProcessLogs())
  await app.stop()
})


// tests
//

test('dat.createNewArchive', async t => {

  // create the dat
  // =
  var res = await app.client.executeAsync((importPath, done) => {
    datInternalAPI.createNewArchive({
      title: 'title',
      description: 'description',
      author: 'author',
      version: '1.0.0',
      forkOf: 'dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8',
      origin: 'dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8',
      originTitle: 'foo bar app',
      importFiles: importPath
    }).then(done, done)
  }, path.join(__dirname, 'scaffold', 'test-static-dat'))
  createdDatKey = res.value
  t.truthy(/^[0-9a-f]{64}$/.test(createdDatKey))
  createdDatURL = 'dat://' + createdDatKey

  // wait a sec for the meta to get updated
  await app.client.pause(1000)

  // verify archive
  // =
  var res = await app.client.executeAsync((key, done) => {
    datInternalAPI.getArchiveDetails(key).then(done, done)
  }, createdDatKey)
  console.log(res.value)
  t.deepEqual(res.value.title, 'title')
  t.deepEqual(res.value.description, 'description')
  t.deepEqual(res.value.author, 'author')
  t.deepEqual(res.value.forkOf, ['dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8'])
  t.deepEqual(res.value.createdBy.url, 'dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8')
  t.deepEqual(res.value.createdBy.title, 'foo bar app')
  t.deepEqual(res.value.version, '1.0.0')
})

  // queryArchives: 'promise',

  // createNewArchive: 'promise',
  // forkArchive: 'promise',
  // setArchiveUserSettings: 'promise',

  // writeArchiveFileFromPath: 'promise',
  // exportFileFromArchive: 'promise'


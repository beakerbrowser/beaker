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
      forkOf: 'dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8',
      origin: 'dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8',
      originTitle: 'foo bar app',
      importFiles: importPath,
      inplaceImport: true
    }).then(done, done)
  }, path.join(__dirname, 'scaffold', 'test-static-dat'))
  createdDatKey = res.value
  t.truthy(/^[0-9a-f]{64}$/.test(createdDatKey))
  createdDatURL = 'dat://' + createdDatKey

  // wait a sec for the meta to get updated
  await app.client.pause(2000)

  // verify archive
  // =
  var res = await app.client.executeAsync((key, done) => {
    datInternalAPI.getArchiveDetails(key).then(done, done)
  }, createdDatKey)
  t.deepEqual(res.value.title, 'title')
  t.deepEqual(res.value.description, 'description')
  t.deepEqual(res.value.author, 'author')
  t.deepEqual(res.value.forkOf, ['dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8'])
  t.deepEqual(res.value.createdBy.url, 'dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8')
  t.deepEqual(res.value.createdBy.title, 'foo bar app')
})

test('dat.forkArchive', async t => {

  // create the dat
  // =
  var res = await app.client.executeAsync((key, done) => {
    datInternalAPI.forkArchive(key, {
      title: 'new title',
      description: 'new description',
      author: 'new author'
    }).then(done, done)
  }, createdDatKey)
  var forkedDatKey = res.value
  t.truthy(/^[0-9a-f]{64}$/.test(forkedDatKey))

  // wait a sec for the meta to get updated
  await app.client.pause(2000)

  // verify archive
  // =
  var res = await app.client.executeAsync((key, done) => {
    datInternalAPI.getArchiveDetails(key).then(done, done)
  }, forkedDatKey)
  t.deepEqual(res.value.title, 'new title')
  t.deepEqual(res.value.description, 'new description')
  t.deepEqual(res.value.author, 'new author')
  t.deepEqual(res.value.forkOf, ['dat://1f68b801559be9a02666988fb256f97d79e0bf74455292491763641687b22ae8', createdDatURL+'/'])
  t.deepEqual(res.value.createdBy, null)
  t.deepEqual(res.value.version, '')
})

test('dat.writeArchiveFileFromPath', async t => {

  // write a single file
  // =

  var res = await app.client.executeAsync((key, src, done) => {
    datInternalAPI.writeArchiveFileFromPath(key, {
      src: src,
      dst: '/new-subdir'
    }).then(done, done)
  }, createdDatKey, path.join(__dirname, 'scaffold', 'test-static-dat', 'hello.txt'))
  t.falsy(res.value.name)

  var res = await app.client.executeAsync((key, done) => {
    dat.readDirectory('dat://' + key + '/new-subdir', null).then(done, done)
  }, createdDatKey)
  t.truthy(res.value && ('hello.txt' in res.value))

  // write a folder
  // =
  
  var res = await app.client.executeAsync((key, src, done) => {
    datInternalAPI.writeArchiveFileFromPath(key, {
      src: src,
      dst: '/new-subdir2'
    }).then(done, done)
  }, createdDatKey, path.join(__dirname, 'scaffold', 'test-static-dat'))
  t.falsy(res.value.name)

  var res = await app.client.executeAsync((key, done) => {
    dat.listFiles('dat://' + key + '/new-subdir2', null).then(done, done)
  }, createdDatKey)
  t.deepEqual(Object.keys(res.value).length, 3)

})


test('dat.exportFileFromArchive', async t => {

  // export a single file
  // =

  var tmpOutputPath1 = path.join(fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'))
  var res = await app.client.executeAsync((key, path, done) => {
    datInternalAPI.exportFileFromArchive(key, '/hello.txt', path).then(done, done)
  }, createdDatKey, path.join(tmpOutputPath1, 'hello.txt'))
  t.falsy(res.value.name)
  t.deepEqual(fs.readFileSync(path.join(tmpOutputPath1, 'hello.txt'), 'utf8'), 'hello')

  // export the whole dat
  // =
  
  var tmpOutputPath2 = path.join(fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'))
  var res = await app.client.executeAsync((key, path, done) => {
    datInternalAPI.exportFileFromArchive(key, '/', path).then(done, done)
  }, createdDatKey, tmpOutputPath2)
  t.falsy(res.value.name)
  t.deepEqual(fs.readdirSync(tmpOutputPath2).length, 6)

})


import test from 'ava'
import {Application} from 'spectron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {createDat} from './lib/dat-helpers'
var createdDatUrl
var createdFilePath = tempy.directory()

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
  // open the window
  await app.start()
  await app.client.waitUntilWindowLoaded(20e3)

  // open the default start page
  await app.client.windowByIndex(1)
  await app.client.waitForExist('body > *')
})
test.after.always('cleanup', async t => {
  console.log(JSON.stringify(await app.client.getMainProcessLogs(), null, 2))
  await app.stop()
})

test('set & get workspaces (using create)', async t => {
  await app.client.windowByIndex(0)

  // create a dat
  var res = await app.client.executeAsync((done) => {
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false }).then(done,done)
  })
  let url = res.value.url
  t.truthy(url.startsWith('dat://'))

  var res = await app.client.executeAsync((url, path, done) => {
    window.beaker.workspaces.create(0, {publishTargetUrl: url, localFilesPath: path}).then(done, done)
  }, url, tempy.directory())
  for (let k in res.value) {
    res.value[k] = res.value[k] ? typeof res.value[k] : res.value[k]
  }
  t.deepEqual(res.value, {
    localFilesPath: 'string',
    name: 'string',
    publishTargetUrl: 'string'
  })
})

test('set & get workspaces (manually)', async t => {
  await app.client.windowByIndex(0)

  // create a dat
  var res = await app.client.executeAsync((done) => {
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false }).then(done,done)
  })
  createdDatUrl = res.value.url
  t.truthy(createdDatUrl.startsWith('dat://'))

  // set
  var res = await app.client.executeAsync((url, path, done) => {
    window.beaker.workspaces.set(0, 'test-ws', {publishTargetUrl: url, localFilesPath: path}).then(done, done)
  }, createdDatUrl, createdFilePath)
  t.falsy(res.value)

  // get
  var res = await app.client.executeAsync((done) => {
    window.beaker.workspaces.get(0, 'test-ws').then(done, done)
  })
  res.value.createdAt = typeof res.value.createdAt
  res.value.updatedAt = typeof res.value.updatedAt
  t.deepEqual(res.value, {
    profileId: 0,
    name: 'test-ws',
    localFilesPath: createdFilePath,
    publishTargetUrl: createdDatUrl,
    createdAt: 'number',
    updatedAt: 'number'
  })

  // get by publish target url
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.workspaces.get(0, url).then(done, done)
  }, createdDatUrl)
  res.value.createdAt = typeof res.value.createdAt
  res.value.updatedAt = typeof res.value.updatedAt
  t.deepEqual(res.value, {
    profileId: 0,
    name: 'test-ws',
    localFilesPath: createdFilePath,
    publishTargetUrl: createdDatUrl,
    createdAt: 'number',
    updatedAt: 'number'
  })
})

test('initialize a workspace folder', async t => {
  // setup
  var res = await app.client.executeAsync((done) => {
    window.beaker.workspaces.setupFolder(0, 'test-ws').then(done, done)
  })
  t.truthy(res.value)

  // check the files are set
  const dir = jetpack.cwd(createdFilePath)
  t.truthy(await dir.existsAsync('dat.json'))
})

test('view a workspace', async t => {
  // open workspace
  await app.client.windowByIndex(0)
  await browserdriver.navigateTo(app, 'workspace://test-ws')
  await app.client.windowByIndex(1)
  await app.client.waitForExist('.entry.file', 10e3)
  t.pass()
})

test('diff and publish changes (additions)', async t => {
  await app.client.windowByIndex(0)

  // write file
  await jetpack.write(createdFilePath + '/index.html', '<h1 id="loaded">workspace</h1>\n<p>foo</p>\n<p>bar</p>')

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [
    {change: 'add',path: '/index.html',type: 'file'}
  ])

  // get file diff
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.diff(0, 'test-ws', '/index.html').then(done, done)
  })
  t.deepEqual(res.value[0].added, true)
  t.deepEqual(typeof res.value[0].count, 'number')
  t.deepEqual(typeof res.value[0].value, 'string')

  // publish
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.publish(0, 'test-ws').then(done, done)
  })
  t.falsy(res.value)

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [])
})

test('diff and publish changes (additions and modifications)', async t => {
  await app.client.windowByIndex(0)

  // update index.html
  await jetpack.write(createdFilePath + '/index.html', '<h1 id="loaded">workspace</h1>\n<p>fuzz</p>\n<p>bar</p>')
  // add an new.txt
  await jetpack.write(createdFilePath + '/new.txt', 'hi!')

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [
    {change: 'add', path: '/new.txt', type: 'file'},
    {change: 'mod', path: '/index.html', type: 'file'}
  ])

  // get file diff
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.diff(0, 'test-ws', '/index.html').then(done, done)
  })
  t.deepEqual(res.value, [
    { count: 1, value: '<h1 id="loaded">workspace</h1>\n' },
    { count: 1, removed: true, value: '<p>foo</p>\n' },
    { added: true, count: 1, value: '<p>fuzz</p>\n' },
    { count: 1, value: '<p>bar</p>' }
  ])
  
  // publish
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.publish(0, 'test-ws').then(done, done)
  })
  t.falsy(res.value)

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [])
})

test('diff and revert changes (deletions)', async t => {
  await app.client.windowByIndex(0)

  // remove new.txt
  await jetpack.remove(createdFilePath + '/new.txt')

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [
    {change: 'del', path: '/new.txt', type: 'file'}
  ])

  // get file diff
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.diff(0, 'test-ws', '/new.txt').then(done, done)
  })
  t.deepEqual(res.value, [{count:1,removed:true,value:"hi!"}])

  // revert
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.revert(0, 'test-ws').then(done, done)
  })
  t.falsy(res.value)

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [])
})

test('diff and selective publish and revert', async t => {
  await app.client.windowByIndex(0)

  // remove new.txt
  await jetpack.remove(createdFilePath + '/index.html')
  await jetpack.remove(createdFilePath + '/new.txt')

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [
    {change: 'del', path: '/index.html', type: 'file'},
    {change: 'del', path: '/new.txt', type: 'file'}
  ])

  // publish selective
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.publish(0, 'test-ws', {paths: ['/new.txt']}).then(done, done)
  })
  t.falsy(res.value)

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [
    {change: 'del', path: '/index.html', type: 'file'}
  ])

  // revert selective
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.revert(0, 'test-ws', {paths: ['/index.html']}).then(done, done)
  })
  t.falsy(res.value)

  // list changed files
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.listChangedFiles(0, 'test-ws').then(done, done)
  })
  t.deepEqual(res.value, [])
})

test('diff() doesnt try to diff binary files', async t => {
  await app.client.windowByIndex(0)

  // write binary file in the local folder
  await jetpack.write(createdFilePath + '/binary.weirdext', Buffer.from([0, 1, 2, 3, 4]))

  // doesnt do a file diff (added file)
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.diff(0, 'test-ws', '/binary.weirdext').then(done, done)
  })
  t.deepEqual(res.value.invalidEncoding, true)

  // publish
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.publish(0, 'test-ws').then(done, done)
  })
  t.falsy(res.value)

  // remove binary file in the local folder
  await jetpack.remove(createdFilePath + '/binary.weirdext')

  // doesnt do a file diff (removed file)
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.diff(0, 'test-ws', '/binary.weirdext').then(done, done)
  })
  t.deepEqual(res.value.invalidEncoding, true)

  // publish
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.publish(0, 'test-ws').then(done, done)
  })
  t.falsy(res.value)
})

test('set() doesnt allow bad values', async t => {
  await app.client.windowByIndex(0)

  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.set(0, 'test-ws', {publishTargetUrl: 'asdf'}).then(done, done)
  })
  t.deepEqual(res.value.name, 'InvalidURLError')

  var res = await app.client.executeAsync((path, done) => {
    window.beaker.workspaces.set(0, 'test-ws', {localFilesPath: path}).then(done, done)
  }, createdFilePath + '/index.html')
  t.deepEqual(res.value.name, 'NotAFolderError')

  var res = await app.client.executeAsync((path, done) => {
    window.beaker.workspaces.set(0, 'test-ws', {localFilesPath: path}).then(done, done)
  }, os.homedir())
  t.deepEqual(res.value.name, 'ProtectedFileNotWritableError')
})

test('set() doesnt allow dats which are unowned or deleted', async t => {
  await app.client.windowByIndex(0)

  // create an unowned dat
  var unownedDat = await createDat()
  var unownedDatUrl = 'dat://' + unownedDat.archive.key.toString('hex')

  // try to create a workspace with the unowned dat
  var res = await app.client.executeAsync((url, path, done) => {
    window.beaker.workspaces.set(0, 'unowned-ws', {publishTargetUrl: url, localFilesPath: path}).then(done, done)
  }, unownedDatUrl, tempy.directory())
  t.deepEqual(res.value.name, 'ArchiveNotWritableError')

  // create a deleted dat
  var res = await app.client.executeAsync((done) => {
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false }).then(done,done)
  })
  var deletedDatUrl = res.value.url
  t.truthy(deletedDatUrl.startsWith('dat://'))
  var res = await app.client.executeAsync((url, done) => {
    window.beaker.archives.remove(url, {noPrompt: true}).then(done,done)
  }, deletedDatUrl)

  // try to create a workspace with the deleted dat
  var res = await app.client.executeAsync((url, path, done) => {
    window.beaker.workspaces.set(0, 'deleted-ws', {publishTargetUrl: url, localFilesPath: path}).then(done, done)
  }, deletedDatUrl, tempy.directory())
  t.deepEqual(res.value.name, 'ArchiveNotWritableError')
})

test('set() can rename a workspace', async t => {
  // set
  var res = await app.client.executeAsync(done => {
    window.beaker.workspaces.set(0, 'test-ws', {name: 'test-workspace'}).then(done, done)
  })
  t.falsy(res.value)

  // get
  var res = await app.client.executeAsync((done) => {
    window.beaker.workspaces.get(0, 'test-workspace').then(done, done)
  })
  res.value.createdAt = typeof res.value.createdAt
  res.value.updatedAt = typeof res.value.updatedAt
  t.deepEqual(res.value, {
    profileId: 0,
    name: 'test-workspace',
    localFilesPath: createdFilePath,
    publishTargetUrl: createdDatUrl,
    createdAt: 'number',
    updatedAt: 'number'
  })
})
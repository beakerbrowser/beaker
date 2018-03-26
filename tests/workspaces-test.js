import test from 'ava'
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
  await app.isReady
})
test.after.always('cleanup', async t => {
  await app.stop()
})

test('set & get workspaces (using create)', async t => {
  // create a dat
  var res = await app.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  let url = res.url
  t.truthy(url.startsWith('dat://'))

  var res = await app.executeJavascript(`
    window.beaker.workspaces.create(0, {publishTargetUrl: "${url}", localFilesPath: "${tempy.directory()}"})
  `)
  for (let k in res) {
    res[k] = res[k] ? typeof res[k] : res[k]
  }
  t.deepEqual(res, {
    localFilesPath: 'string',
    name: 'string',
    publishTargetUrl: 'string'
  })
})

test('set & get workspaces (manually)', async t => {

  // create a dat
  var res = await app.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  createdDatUrl = res.url
  t.truthy(createdDatUrl.startsWith('dat://'))

  // set
  var res = await app.executeJavascript(`
    window.beaker.workspaces.set(0, 'test-ws', {publishTargetUrl: "${createdDatUrl}", localFilesPath: "${createdFilePath}"})
  `)
  t.falsy(res)

  // get
  var res = await app.executeJavascript(`
    window.beaker.workspaces.get(0, 'test-ws')
  `)
  res.createdAt = typeof res.createdAt
  res.updatedAt = typeof res.updatedAt
  t.deepEqual(res, {
    profileId: 0,
    name: 'test-ws',
    localFilesPath: createdFilePath,
    publishTargetUrl: createdDatUrl,
    createdAt: 'number',
    updatedAt: 'number'
  })

  // get by publish target url
  var res = await app.executeJavascript(`
    window.beaker.workspaces.get(0, "${createdDatUrl}")
  `)
  res.createdAt = typeof res.createdAt
  res.updatedAt = typeof res.updatedAt
  t.deepEqual(res, {
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
  var res = await app.executeJavascript(`
    window.beaker.workspaces.setupFolder(0, 'test-ws')
  `)
  t.truthy(res)

  // check the files are set
  const dir = jetpack.cwd(createdFilePath)
  t.truthy(await dir.existsAsync('dat.json'))
})

test('view a workspace', async t => {
  // open workspace
  var tab = app.getTab(0)
  await tab.navigateTo('workspace://test-ws')
  await tab.waitForElement('.entry.file')
  t.pass()
})

test('diff and publish changes (additions)', async t => {
  // write file
  await jetpack.write(createdFilePath + '/index.html', '<h1 id="loaded">workspace</h1>\n<p>foo</p>\n<p>bar</p>')

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [
    {change: 'add',path: '/index.html',type: 'file'}
  ])

  // get file diff
  var res = await app.executeJavascript(`
    window.beaker.workspaces.diff(0, 'test-ws', '/index.html')
  `)
  t.deepEqual(res[0].added, true)
  t.deepEqual(typeof res[0].count, 'number')
  t.deepEqual(typeof res[0].value, 'string')

  // publish
  var res = await app.executeJavascript(`
    window.beaker.workspaces.publish(0, 'test-ws')
  `)
  t.falsy(res)

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [])
})

test('diff and publish changes (additions and modifications)', async t => {

  // update index.html
  await jetpack.write(createdFilePath + '/index.html', '<h1 id="loaded">workspace</h1>\n<p>fuzz</p>\n<p>bar</p>')
  // add an new.txt
  await jetpack.write(createdFilePath + '/new.txt', 'hi!')

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [
    {change: 'add', path: '/new.txt', type: 'file'},
    {change: 'mod', path: '/index.html', type: 'file'}
  ])

  // get file diff
  var res = await app.executeJavascript(`
    window.beaker.workspaces.diff(0, 'test-ws', '/index.html')
  `)
  t.deepEqual(res, [
    { count: 1, value: '<h1 id="loaded">workspace</h1>\n' },
    { count: 1, removed: true, value: '<p>foo</p>\n' },
    { added: true, count: 1, value: '<p>fuzz</p>\n' },
    { count: 1, value: '<p>bar</p>' }
  ])
  
  // publish
  var res = await app.executeJavascript(`
    window.beaker.workspaces.publish(0, 'test-ws')
  `)
  t.falsy(res)

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [])
})

test('diff and revert changes (deletions)', async t => {
  // remove new.txt
  await jetpack.remove(createdFilePath + '/new.txt')

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [
    {change: 'del', path: '/new.txt', type: 'file'}
  ])

  // get file diff
  var res = await app.executeJavascript(`
    window.beaker.workspaces.diff(0, 'test-ws', '/new.txt')
  `)
  t.deepEqual(res, [{count:1,removed:true,value:"hi!"}])

  // revert
  var res = await app.executeJavascript(`
    window.beaker.workspaces.revert(0, 'test-ws')
  `)
  t.falsy(res)

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [])
})

test('diff and selective publish and revert', async t => {

  // remove new.txt
  await jetpack.remove(createdFilePath + '/index.html')
  await jetpack.remove(createdFilePath + '/new.txt')

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [
    {change: 'del', path: '/index.html', type: 'file'},
    {change: 'del', path: '/new.txt', type: 'file'}
  ])

  // publish selective
  var res = await app.executeJavascript(`
    window.beaker.workspaces.publish(0, 'test-ws', {paths: ['/new.txt']})
  `)
  t.falsy(res)

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [
    {change: 'del', path: '/index.html', type: 'file'}
  ])

  // revert selective
  var res = await app.executeJavascript(`
    window.beaker.workspaces.revert(0, 'test-ws', {paths: ['/index.html']})
  `)
  t.falsy(res)

  // list changed files
  var res = await app.executeJavascript(`
    window.beaker.workspaces.listChangedFiles(0, 'test-ws')
  `)
  t.deepEqual(res, [])
})

test('diff() doesnt try to diff binary files', async t => {

  // write binary file in the local folder
  await jetpack.write(createdFilePath + '/binary.weirdext', Buffer.from([0, 1, 2, 3, 4]))

  // doesnt do a file diff (added file)
  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.diff(0, 'test-ws', '/binary.weirdext')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidEncodingError')
  }

  // publish
  var res = await app.executeJavascript(`
    window.beaker.workspaces.publish(0, 'test-ws')
  `)
  t.falsy(res)

  // remove binary file in the local folder
  await jetpack.remove(createdFilePath + '/binary.weirdext')

  // doesnt do a file diff (removed file)
  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.diff(0, 'test-ws', '/binary.weirdext')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidEncodingError')
  }

  // publish
  var res = await app.executeJavascript(`
    window.beaker.workspaces.publish(0, 'test-ws')
  `)
  t.falsy(res)
})

test('set() doesnt allow bad values', async t => {

  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.set(0, 'test-ws', {publishTargetUrl: 'asdf'})
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidURLError')
  }

  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.set(0, 'test-ws', {localFilesPath: "${createdFilePath + '/index.html'}"})
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotAFolderError')
  }

  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.set(0, 'test-ws', {localFilesPath: "${os.homedir()}"})
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ProtectedFileNotWritableError')
  }
})

test('set() doesnt allow dats which are unowned or deleted', async t => {

  // create an unowned dat
  var unownedDat = await createDat()
  var unownedDatUrl = 'dat://' + unownedDat.archive.key.toString('hex')

  // try to create a workspace with the unowned dat
  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.set(0, 'unowned-ws', {publishTargetUrl: "${unownedDatUrl}", localFilesPath: "${tempy.directory()}"})
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }

  // create a deleted dat
  var res = await app.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  var deletedDatUrl = res.url
  t.truthy(deletedDatUrl.startsWith('dat://'))
  var res = await app.executeJavascript(`
    window.beaker.archives.remove("${deletedDatUrl}", {noPrompt: true})
  `)

  // try to create a workspace with the deleted dat
  try {
    var res = await app.executeJavascript(`
      window.beaker.workspaces.set(0, 'deleted-ws', {publishTargetUrl: "${deletedDatUrl}", localFilesPath: "${tempy.directory()}"})
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
})

test('set() can rename a workspace', async t => {
  // set
  var res = await app.executeJavascript(`
    window.beaker.workspaces.set(0, 'test-ws', {name: 'test-workspace'})
  `)
  t.falsy(res)

  // get
  var res = await app.executeJavascript(`
    window.beaker.workspaces.get(0, 'test-workspace')
  `)
  res.createdAt = typeof res.createdAt
  res.updatedAt = typeof res.updatedAt
  t.deepEqual(res, {
    profileId: 0,
    name: 'test-workspace',
    localFilesPath: createdFilePath,
    publishTargetUrl: createdDatUrl,
    createdAt: 'number',
    updatedAt: 'number'
  })
})
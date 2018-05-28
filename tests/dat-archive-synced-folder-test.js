import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {waitForSync, escapeWindowsSlashes} from './lib/test-helpers'

var createdDatUrl
var createdFilePath = tempy.directory()
var mainTab

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
  mainTab = app.getTab(0)
})
test.after.always('cleanup', async t => {
  await app.stop()
})

test('setLocalSyncPath', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  createdDatUrl = res.url
  t.truthy(createdDatUrl.startsWith('dat://'))

  // set
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(createdFilePath)}")
  `)
  t.falsy(res)

  // wait for sync
  await waitForSync(mainTab, createdDatUrl, 'folder')

  // sync occurred
  const dir = jetpack.cwd(createdFilePath)
  t.truthy(await dir.existsAsync('dat.json'))

  // check info
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.getInfo()
  `)
  t.deepEqual(res.userSettings.localSyncPath, createdFilePath)
})

test('sync archive->folder on change', async t => {
  const dir = jetpack.cwd(createdFilePath)

  // write a new file
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'bar')
  `)

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'folder')
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // new file was synced
  t.deepEqual(await dir.readAsync('archive-foo.txt'), 'bar')

  // old files were synced
  t.truthy(await dir.existsAsync('dat.json'))

  // modify the file
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'bazz')
  `)

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'folder')
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // modified file was synced
  t.deepEqual(await dir.readAsync('archive-foo.txt'), 'bazz')

  // delete the file
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.unlink('/archive-foo.txt')
  `)

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'folder')
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // removed file was synced
  t.falsy(await dir.existsAsync('archive-foo.txt'))
})

test('sync folder->archive on change', async t => {
  const dir = jetpack.cwd(createdFilePath)

  // write a new file
  await dir.write('local-foo.txt', 'bar')

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // new file was synced
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readFile('/local-foo.txt')
  `)
  t.deepEqual(res, 'bar')

  // modify the file
  await dir.write('local-foo.txt', 'bazz')

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // modified file was synced
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readFile('/local-foo.txt')
  `)
  t.deepEqual(res, 'bazz')

  // delete the file
  await dir.removeAsync('local-foo.txt')

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // removed file was synced
  try {
    await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatUrl}")
      archive.readFile('/local-foo.txt')
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }
})

test('sync folder->archive wins over archive->folder when they happen simultaneously', async t => {
  const dir = jetpack.cwd(createdFilePath)

  // write a new file locally
  await dir.write('local-foo.txt', 'bar')

  // write a new file on the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'bar')
  `)

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // folder won (check archive)
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readFile('/local-foo.txt')
  `)
  t.deepEqual(res, 'bar')
  try {
    await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatUrl}")
      archive.readFile('/archive-foo.txt')
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }

  // folder won (check folder)
  t.deepEqual(await dir.readAsync('local-foo.txt'), 'bar')
  t.falsy(await dir.existsAsync('archive-foo.txt'))
})

test('setLocalSyncPath() doesnt allow bad values', async t => {
  try {
    var res = await mainTab.executeJavascript(`
      beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(path.join(createdFilePath, 'dat.json'))}")
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotAFolderError')
  }

  try {
    var res = await mainTab.executeJavascript(`
      beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(os.homedir())}")
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ProtectedFileNotWritableError')
  }
})

test('getInfo() lets you know if the folder is missing', async t => {
  const dir = jetpack.cwd(createdFilePath)

  // delete the folder
  await dir.removeAsync()

  // get info
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.getInfo()
  `)
  t.falsy(res.userSettings.localSyncPath)
  t.truthy(res.localSyncPathIsMissing)
  t.deepEqual(res.missingLocalSyncPath, createdFilePath)
})

test('additional sync correctness checks', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  createdDatUrl = res.url
  const readArchiveFile = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatUrl}")
      archive.readFile("${path}", 'utf8')
    `)
  )
  t.truthy(createdDatUrl.startsWith('dat://'))

  // write archive files
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    Promise.all([
      archive.writeFile('/archive-file.txt', 'archive'),
      archive.writeFile('/conflict-file.txt', 'archive'),
      archive.mkdir('/archive-folder').then(() => Promise.all([
        archive.writeFile('/archive-folder/file1.txt', 'archive'),
        archive.writeFile('/archive-folder/file2.txt', 'archive')
      ])),
      archive.mkdir('/conflict-folder').then(() => Promise.all([
        archive.writeFile('/conflict-folder/file1.txt', 'archive'),
        archive.writeFile('/conflict-folder/file2.txt', 'archive'),
        archive.writeFile('/conflict-folder/archive-file.txt', 'archive')
      ])),
    ])
  `)

  // create and write local folder
  var localFilePath = tempy.directory()
  const dir = jetpack.cwd(localFilePath)
  await dir.write('local-file.txt', 'local')
  await dir.write('conflict-file.txt', 'local')
  await dir.dirAsync('local-folder')
  await dir.write('local-folder/file1.txt', 'local')
  await dir.write('local-folder/file2.txt', 'local')
  await dir.dirAsync('conflict-folder')
  await dir.write('conflict-folder/file1.txt', 'local')
  await dir.write('conflict-folder/file2.txt', 'local')
  await dir.write('conflict-folder/local-file.txt', 'local')

  // set
  var syncPromise = waitForSync(mainTab, createdDatUrl, 'archive')
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(localFilePath)}")
  `)
  t.falsy(res)

  // wait for sync to occur
  await syncPromise

  // check local folder
  t.deepEqual((await dir.listAsync()).sort(), ['.datignore', 'dat.json', 'local-file.txt', 'conflict-file.txt', 'archive-file.txt', 'local-folder', 'conflict-folder', 'archive-folder'].sort())
  t.deepEqual((await dir.listAsync('local-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual((await dir.listAsync('archive-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual((await dir.listAsync('conflict-folder')).sort(), ['file1.txt', 'file2.txt', 'archive-file.txt', 'local-file.txt'].sort())
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('conflict-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive')
  t.deepEqual(await dir.readAsync('local-folder/file1.txt'), 'local')
  t.deepEqual(await dir.readAsync('local-folder/file2.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-folder/file1.txt'), 'archive')
  t.deepEqual(await dir.readAsync('archive-folder/file2.txt'), 'archive')
  t.deepEqual(await dir.readAsync('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await dir.readAsync('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await dir.readAsync('conflict-folder/local-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('conflict-folder/archive-file.txt'), 'archive')

  // check the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.sort(), [
    '.datignore', 'dat.json',
    'local-file.txt', 'conflict-file.txt', 'archive-file.txt',
    'local-folder', 'local-folder/file1.txt', 'local-folder/file2.txt',
    'conflict-folder', 'conflict-folder/file1.txt', 'conflict-folder/file2.txt', 'conflict-folder/archive-file.txt', 'conflict-folder/local-file.txt',
    'archive-folder', 'archive-folder/file1.txt', 'archive-folder/file2.txt'
  ].sort())
  t.deepEqual(await readArchiveFile('local-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('conflict-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive')
  t.deepEqual(await readArchiveFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readArchiveFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readArchiveFile('archive-folder/file1.txt'), 'archive')
  t.deepEqual(await readArchiveFile('archive-folder/file2.txt'), 'archive')
  t.deepEqual(await readArchiveFile('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await readArchiveFile('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await readArchiveFile('conflict-folder/local-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('conflict-folder/archive-file.txt'), 'archive')

  // remove the conflict folder locally
  await dir.removeAsync('conflict-folder')

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // check local folder
  t.deepEqual((await dir.listAsync()).sort(), ['.datignore', 'dat.json', 'local-file.txt', 'conflict-file.txt', 'archive-file.txt', 'local-folder', 'archive-folder'].sort())
  t.deepEqual((await dir.listAsync('local-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual((await dir.listAsync('archive-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('conflict-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive')
  t.deepEqual(await dir.readAsync('local-folder/file1.txt'), 'local')
  t.deepEqual(await dir.readAsync('local-folder/file2.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-folder/file1.txt'), 'archive')
  t.deepEqual(await dir.readAsync('archive-folder/file2.txt'), 'archive')

  // check the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.sort(), [
    '.datignore', 'dat.json',
    'local-file.txt', 'conflict-file.txt', 'archive-file.txt',
    'local-folder', 'local-folder/file1.txt', 'local-folder/file2.txt',
    'archive-folder', 'archive-folder/file1.txt', 'archive-folder/file2.txt'
  ].sort())
  t.deepEqual(await readArchiveFile('local-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('conflict-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive')
  t.deepEqual(await readArchiveFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readArchiveFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readArchiveFile('archive-folder/file1.txt'), 'archive')
  t.deepEqual(await readArchiveFile('archive-folder/file2.txt'), 'archive')

  // remove the local-folder in the local
  await dir.removeAsync('local-folder')
  // and the archive-folder in the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.rmdir('/archive-folder', {recursive: true})
  `)
  // the simultaneous local-folder change *SHOULD* cause the archive-folder deletion to be reverted

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // check local folder
  t.deepEqual((await dir.listAsync()).sort(), ['.datignore', 'dat.json', 'local-file.txt', 'conflict-file.txt', 'archive-file.txt', 'archive-folder'].sort())
  t.deepEqual((await dir.listAsync('archive-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('conflict-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive')
  t.deepEqual(await dir.readAsync('archive-folder/file1.txt'), 'archive')
  t.deepEqual(await dir.readAsync('archive-folder/file2.txt'), 'archive')

  // check the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.sort(), [
    '.datignore', 'dat.json',
    'local-file.txt', 'conflict-file.txt', 'archive-file.txt',
    'archive-folder', 'archive-folder/file1.txt', 'archive-folder/file2.txt'
  ].sort())
  t.deepEqual(await readArchiveFile('local-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('conflict-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive')
  t.deepEqual(await readArchiveFile('archive-folder/file1.txt'), 'archive')
  t.deepEqual(await readArchiveFile('archive-folder/file2.txt'), 'archive')
})

test('dat.json merges effectively with local sync path', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({title: 'Dat Title', description: 'Dat Description', links: {foo: 'dat://bar.com'}, prompt: false})
  `)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))

  // create a folder and write a dat.json
  var filePath = tempy.directory()
  var dir = jetpack.cwd(filePath)
  await dir.write('dat.json', {title: 'Local Title', description: 'Local Description', fallback_page: '/foo.html'})

  // set path
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${datUrl}", "${escapeWindowsSlashes(filePath)}")
  `)
  t.falsy(res)

  // wait for sync
  await waitForSync(mainTab, datUrl, 'folder')

  // check local file
  t.deepEqual(JSON.parse(await dir.read('dat.json')), {
    title: 'Local Title',
    description: 'Local Description',
    links: {foo: [{href: 'dat://bar.com'}]},
    fallback_page: '/foo.html'
  })

  // check info
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.readFile('/dat.json').then(JSON.parse)
  `)
  t.deepEqual(res.title, 'Local Title')
  t.deepEqual(res.description, 'Local Description')
})

// TODO
// this has been disabled due to the security risk of running an npm script
// see #982
// -prf
test.skip('build tool test', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  createdDatUrl = res.url
  const readArchiveFile = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatUrl}")
      archive.readFile("${path}", 'utf8')
    `)
  )
  t.truthy(createdDatUrl.startsWith('dat://'))

  // create local folder
  var localFilePath = tempy.directory()
  const dir = jetpack.cwd(localFilePath)

  // add package.json
  await dir.write('package.json', '{"scripts":{"watch-build": "cp ./foo.txt ./bar.txt"}}')

  // set
  var syncPromise = waitForSync(mainTab, createdDatUrl, 'archive')
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(localFilePath)}")
  `)
  t.falsy(res)

  // wait for sync to occur
  await syncPromise

  // trigger the build
  await dir.write('foo.txt', 'test')

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // check local folder
  t.deepEqual(await dir.readAsync('foo.txt'), 'test')
  t.deepEqual(await dir.readAsync('bar.txt'), 'test')

  // check the archive
  t.deepEqual(await readArchiveFile('foo.txt'), 'test')
  t.deepEqual(await readArchiveFile('bar.txt'), 'test')
})

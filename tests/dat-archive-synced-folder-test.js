import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {waitForSync, toUnixPath, escapeWindowsSlashes} from './lib/test-helpers'

var createdDatUrl
var createdFilePath = fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
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
  console.log('starting dat-archive-synced-folder-test')
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
  var syncPromise = waitForSync(mainTab, createdDatUrl, 'folder')
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(createdFilePath)}")
  `)
  t.falsy(res)

  // wait for sync
  await syncPromise

  // sync occurred
  const dir = jetpack.cwd(createdFilePath)
  t.truthy(dir.exists('dat.json'))

  // check info
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.getInfo()
  `)
  t.deepEqual(res.userSettings.localSyncPath, createdFilePath)

  // wait for final sync (.datignore often needs to be written)
  var res = await mainTab.executeJavascript(`
    beaker.archives.ensureLocalSyncFinished("${createdDatUrl}")
  `)
})

test('sync archive->folder on change', async t => {
  const dir = jetpack.cwd(createdFilePath)

  // write a new file
  var syncPromise = waitForSync(mainTab, createdDatUrl, 'folder')
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'bar')
  `)

  // wait for sync to occur
  await syncPromise
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // new file was synced
  t.deepEqual(await dir.readAsync('archive-foo.txt'), 'bar')

  // old files were synced
  t.truthy(dir.exists('dat.json'))

  // modify the file
  var syncPromise = waitForSync(mainTab, createdDatUrl, 'folder')
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'bazz')
  `)

  // wait for sync to occur
  await syncPromise
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // modified file was synced
  t.deepEqual(await dir.readAsync('archive-foo.txt'), 'bazz')

  // delete the file
  var syncPromise = waitForSync(mainTab, createdDatUrl, 'folder')
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.unlink('/archive-foo.txt')
  `)

  // wait for sync to occur
  await syncPromise

  // removed file was synced
  t.falsy(dir.exists('archive-foo.txt'))
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

test('simultaneous writes result in == state', async t => {
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

  const existsArchive = path => mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.stat("${path}").then(_ => 'file', _ => false)
  `)

  // check ==
  t.deepEqual(dir.exists('local-foo.txt'), await existsArchive('/local-foo.txt'))
  t.deepEqual(dir.exists('archive-foo.txt'), await existsArchive('/archive-foo.txt'))
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

test('setLocalSyncPath() allows multiple dats to use the same path', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  var createdDatUrl2 = res.url

  // set both to the same dir
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(createdFilePath)}")
  `)
  t.falsy(res)
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl2}", "${escapeWindowsSlashes(createdFilePath)}")
  `)
  t.falsy(res)
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

test('multiple archives can have a given local folder', async t => {
  // create 2 dats and one folder
  var dat1Url = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false }).then(a => a.url)
  `)
  var dat2Url = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false }).then(a => a.url)
  `)
  var localFilePath = tempy.directory()

  // set the first
  await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${dat1Url}", "${escapeWindowsSlashes(localFilePath)}")
  `)
  t.is(res, undefined)

  // set the second
  await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${dat2Url}", "${escapeWindowsSlashes(localFilePath)}")
  `)

  // only the second should have it set
  var res = await mainTab.executeJavascript(`(new DatArchive("${dat1Url}")).getInfo()`)
  t.deepEqual(res.userSettings.localSyncPath, localFilePath)
  var res = await mainTab.executeJavascript(`(new DatArchive("${dat2Url}")).getInfo()`)
  t.deepEqual(res.userSettings.localSyncPath, localFilePath)
})

test('additional sync correctness checks', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  createdDatUrl = res.url
  const readArchiveFolder = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatUrl}")
      archive.readdir("${path}").catch(e => [])
    `)
  )
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
  t.deepEqual(res.map(toUnixPath).sort(), [
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
  t.deepEqual(res.map(toUnixPath).sort(), [
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

  // simultaneous folder deletes:
  // remove the local-folder in the local
  await dir.removeAsync('local-folder')
  // and the archive-folder in the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.rmdir('/archive-folder', {recursive: true})
  `)

  // wait for sync to occur
  await waitForSync(mainTab, createdDatUrl, 'archive')

  // make sure everything is ==
  t.deepEqual((await dir.listAsync() || []).sort(), (await readArchiveFolder('/')).sort())
  t.deepEqual((await dir.listAsync('archive-folder') || []).sort(), (await readArchiveFolder('/archive-folder')).sort())
  t.deepEqual(await dir.readAsync('local-file.txt'), await readArchiveFile('local-file.txt'))
  t.deepEqual(await dir.readAsync('conflict-file.txt'), await readArchiveFile('conflict-file.txt'))
  t.deepEqual(await dir.readAsync('archive-file.txt'), await readArchiveFile('archive-file.txt'))
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

test('previewMode=true with a local folder', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({title: 'Dat Title', description: 'Dat Description', prompt: false})
  `)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))

  const readArchiveFile = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${datUrl}")
      archive.readFile("${path}", 'utf8')
    `)
  )

  // create a folder
  var filePath = tempy.directory()
  var dir = jetpack.cwd(filePath)

  // configure
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${datUrl}", "${escapeWindowsSlashes(filePath)}")
  `)
  t.falsy(res)
  var res = await mainTab.executeJavascript(`
    beaker.archives.setUserSettings("${datUrl}", {previewMode: true})
  `)
  t.deepEqual(res.previewMode, true)

  // write files locally
  await dir.write('local-file.txt', 'local')
  await dir.dirAsync('local-folder')
  await dir.write('local-folder/file1.txt', 'local')
  await dir.write('local-folder/file2.txt', 'local')

  // wait a sec
  await new Promise(resolve => setTimeout(resolve, 1e3))

  // make sure no sync has occurred
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.map(toUnixPath).sort(), ['.datignore', 'dat.json'].sort())

  // write to the archive
  var syncPromise = waitForSync(mainTab, datUrl, 'folder')
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.writeFile('/archive-file.txt', 'archive')
  `)

  // wait for sync to occur
  await syncPromise

  // check local folder
  t.deepEqual((await dir.listAsync()).sort(), ['.datignore', 'dat.json', 'local-file.txt', 'archive-file.txt', 'local-folder'].sort())
  t.deepEqual((await dir.listAsync('local-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive')

  // check the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.map(toUnixPath).sort(), [
    '.datignore', 'dat.json', 'archive-file.txt',
  ].sort())
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive')

  // turn off preview mode
  // =

  var syncPromise1 = waitForSync(mainTab, datUrl, 'folder')
  var syncPromise2 = waitForSync(mainTab, datUrl, 'archive')
  var res = await mainTab.executeJavascript(`
    beaker.archives.setUserSettings("${datUrl}", {previewMode: false})
  `)
  t.deepEqual(res.previewMode, false)

  // wait for sync to occur
  await syncPromise1
  await syncPromise2
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local folder
  t.deepEqual((await dir.listAsync()).sort(), ['.datignore', 'dat.json', 'local-file.txt', 'archive-file.txt', 'local-folder'].sort())
  t.deepEqual((await dir.listAsync('local-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local')
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive')

  // write locally
  var syncPromise = waitForSync(mainTab, datUrl, 'folder')
  await dir.write('local-file.txt', 'local2')
  await syncPromise
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local and archive
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local2')
  t.deepEqual(await readArchiveFile('local-file.txt'), 'local2')

  // write archively
  var syncPromise = waitForSync(mainTab, datUrl, 'folder')
  await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.writeFile('/archive-file.txt', 'archive2')
  `)
  await syncPromise

  // check local and archive
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive2')
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2')

  // turn on preview model
  // =

  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)
  var res = await mainTab.executeJavascript(`
    beaker.archives.setUserSettings("${datUrl}", {previewMode: true})
  `)
  t.deepEqual(res.previewMode, true)

  // write locally
  await dir.write('local-file.txt', 'local2b')
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local and archive
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local2b')
  t.deepEqual(await readArchiveFile('local-file.txt'), 'local2') // NOTE- no update

  // write to archive
  await mainTab.executeJavascript(`
    (new DatArchive("${datUrl}")).writeFile('/archive-file.txt', 'archive2b')
  `)
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local and archive
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive2b') // NOTE- is updated
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2b')

  // write to both simultaneously
  await dir.write('local-file.txt', 'local2local')
  await mainTab.executeJavascript(`
    (new DatArchive("${datUrl}")).writeFile('/archive-file.txt', 'archive2archive')
  `)
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local and archive
  t.deepEqual(await dir.readAsync('local-file.txt'), 'local2local')
  t.deepEqual(await readArchiveFile('local-file.txt'), 'local2') // NOTE- no update
  t.deepEqual(await dir.readAsync('archive-file.txt'), 'archive2archive') // NOTE- is updated
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2archive')
})

test('previewMode=true without a local folder', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({title: 'Dat Title', description: 'Dat Description', prompt: false})
  `)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))
  var previewDatUrl = res.url + '+preview'

  const readArchiveFile = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${datUrl}")
      archive.readFile("${path}", 'utf8')
    `)
  )
  const readPreviewFile = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${previewDatUrl}")
      archive.readFile("${path}", 'utf8')
    `)
  )
  const readPreviewDir = path => (
    mainTab.executeJavascript(`
      var archive = new DatArchive("${previewDatUrl}")
      archive.readdir("${path}")
    `)
  )

  // configure
  var res = await mainTab.executeJavascript(`
    beaker.archives.setUserSettings("${datUrl}", {previewMode: true})
  `)
  t.deepEqual(res.previewMode, true)


  // write files in the preview
  await mainTab.executeJavascript(`
    var archive = new DatArchive("${previewDatUrl}")
    Promise.all([
      archive.writeFile('/local-file.txt', 'local'),
      archive.mkdir('/local-folder')
    ]).then(res => {
      return Promise.all([
        archive.writeFile('/local-folder/file1.txt', 'local'),
        archive.writeFile('/local-folder/file2.txt', 'local')
      ])
    })
  `)

  // wait a sec
  await new Promise(resolve => setTimeout(resolve, 1e3))


  // make sure no sync has occurred
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.map(toUnixPath).sort(), ['.datignore', 'dat.json'].sort())


  // write to the archive
  var syncPromise = waitForSync(mainTab, datUrl, 'folder')
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.writeFile('/archive-file.txt', 'archive')
  `)


  // wait for sync to occur
  await syncPromise


  // check local folder
  t.deepEqual((await readPreviewDir('/')).sort(), ['.datignore', 'dat.json', 'local-file.txt', 'archive-file.txt', 'local-folder'].sort())
  t.deepEqual((await readPreviewDir('local-folder')).sort(), ['file1.txt', 'file2.txt'].sort())
  t.deepEqual(await readPreviewFile('local-file.txt'), 'local')
  t.deepEqual(await readPreviewFile('archive-file.txt'), 'archive')

  // check the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.readdir('/', {recursive: true})
  `)
  t.deepEqual(res.map(toUnixPath).sort(), [
    '.datignore', 'dat.json', 'archive-file.txt',
  ].sort())
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive')


  // turn off preview mode
  // =

  var res = await mainTab.executeJavascript(`
    beaker.archives.setUserSettings("${datUrl}", {previewMode: false})
  `)
  t.deepEqual(res.previewMode, false)

  // write to archive
  await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.writeFile('/archive-file.txt', 'archive2')
  `)

  // check archive
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2')

  // turn on preview mode
  // =

  var res = await mainTab.executeJavascript(`
    beaker.archives.setUserSettings("${datUrl}", {previewMode: true})
  `)
  t.deepEqual(res.previewMode, true)

  // check local and archive
  t.deepEqual(await readPreviewFile('archive-file.txt'), 'archive2') // NOTE- updated on sync
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2') 

  // write to preview
  await mainTab.executeJavascript(`
    (new DatArchive("${previewDatUrl}")).writeFile('/archive-file.txt', 'local')
  `)

  // check local and archive
  t.deepEqual(await readPreviewFile('archive-file.txt'), 'local')
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2') // NOTE- no update

  // write to archive
  await mainTab.executeJavascript(`
    (new DatArchive("${datUrl}")).writeFile('/archive-file.txt', 'archive2b')
  `)
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local and archive
  t.deepEqual(await readPreviewFile('archive-file.txt'), 'archive2b') // NOTE- is updated
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive2b')

  // write to both simultaneously
  await mainTab.executeJavascript(`
    (new DatArchive("${previewDatUrl}")).writeFile('/archive-file.txt', 'local3')
  `)
  await mainTab.executeJavascript(`
    (new DatArchive("${datUrl}")).writeFile('/archive-file.txt', 'archive3')
  `)
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // check local and archive
  t.deepEqual(await readPreviewFile('archive-file.txt'), 'archive3') // NOTE- archive won
  t.deepEqual(await readArchiveFile('archive-file.txt'), 'archive3')
})

test('diff files and listings with previewMode=true', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({title: 'Dat Title', description: 'Dat Description', prompt: false})
  `)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))

  // create and write local folder
  var filePath = tempy.directory()
  var dir = jetpack.cwd(filePath)
  await dir.write('local-file.txt', 'local')
  await dir.write('conflict-file.txt', 'local')
  await dir.dirAsync('local-folder')
  await dir.write('local-folder/file1.txt', 'local')
  await dir.write('local-folder/file2.txt', 'local')
  await dir.dirAsync('conflict-folder')
  await dir.write('conflict-folder/file1.txt', 'local')
  await dir.write('conflict-folder/file2.txt', 'local')
  await dir.write('conflict-folder/local-file.txt', 'local')

  // set path
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${datUrl}", "${escapeWindowsSlashes(filePath)}", {previewMode: true})
  `)
  t.falsy(res)
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res.map(normalizeDiff), [
    { change: 'add', path: '/conflict-file.txt', type: 'file' },
    { change: 'add', path: '/conflict-folder', type: 'dir' },
    { change: 'add', path: '/local-file.txt', type: 'file' },
    { change: 'add', path: '/local-folder', type: 'dir' }
  ])
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathFile("${datUrl}", '/conflict-file.txt')`)
  t.deepEqual(res, [ { added: true, count: 1, value: 'local' } ])

  // write archive files
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
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
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res.map(normalizeDiff), [
    { change: 'add', path: '/local-file.txt', type: 'file' },
    { change: 'add', path: '/local-folder', type: 'dir' },
    { change: 'add',
      path: '/conflict-folder/local-file.txt',
      type: 'file' }
  ]) // ^NOTE: the writes to the archive synced directly to the local folder

  // write a change locally
  await dir.write('conflict-folder/file1.txt', 'local')
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res.map(normalizeDiff), [
    { change: 'add', path: '/local-file.txt', type: 'file' },
    { change: 'add', path: '/local-folder', type: 'dir' },
    { change: 'add',
      path: '/conflict-folder/local-file.txt',
      type: 'file' },
    { change: 'mod',
      path: '/conflict-folder/file1.txt',
      type: 'file' }
  ])
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathFile("${datUrl}", '/conflict-folder/file1.txt')`)
  t.deepEqual(res, [
    { count: 1, removed: true, value: 'archive' },
    { added: true, count: 1, value: 'local' }
  ])

  // delete locally
  await dir.removeAsync('conflict-folder/file1.txt')
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res.map(normalizeDiff), [
    { change: 'add', path: '/local-file.txt', type: 'file' },
    { change: 'add', path: '/local-folder', type: 'dir' },
    { change: 'del',
      path: '/conflict-folder/file1.txt',
      type: 'file' },
    { change: 'add',
      path: '/conflict-folder/local-file.txt',
      type: 'file' }
  ])
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathFile("${datUrl}", '/conflict-folder/file1.txt')`)
  t.deepEqual(res, [
    { count: 1, removed: true, value: 'archive' }
  ])

  // 'publish'
  await mainTab.executeJavascript(`beaker.archives.publishLocalSyncPathListing("${datUrl}")`)
  
  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res, [])

  // write a change locally
  await dir.write('conflict-folder/file3.txt', 'local')
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // 'revert'
  await mainTab.executeJavascript(`beaker.archives.revertLocalSyncPathListing("${datUrl}")`)
  
  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res, [])
})

test('read/write the preview version when previewMode=true', async t => {
  // create a dat
  var res = await mainTab.executeJavascript(`
    DatArchive.create({title: 'Dat Title', description: 'Dat Description', prompt: false})
  `)
  var datUrl = res.url
  var previewDatUrl = datUrl + '+preview'
  t.truthy(datUrl.startsWith('dat://'))

  const readDatFile = path => (
    mainTab.executeJavascript(`(new DatArchive("${datUrl}")).readFile("${path}", 'utf8')`)
  )
  const readPreviewDatFile = path => (
    mainTab.executeJavascript(`(new DatArchive("${previewDatUrl}")).readFile("${path}", 'utf8')`)
  )

  // create and write local folder
  var filePath = tempy.directory()
  var dir = jetpack.cwd(filePath)
  await dir.write('local-file.txt', 'local')
  await dir.write('conflict-file.txt', 'local')
  await dir.dirAsync('local-folder')
  await dir.write('local-folder/file1.txt', 'local')
  await dir.write('local-folder/file2.txt', 'local')
  await dir.dirAsync('conflict-folder')
  await dir.write('conflict-folder/file1.txt', 'local')
  await dir.write('conflict-folder/file2.txt', 'local')
  await dir.write('conflict-folder/local-file.txt', 'local')

  // set path
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${datUrl}", "${escapeWindowsSlashes(filePath)}", {previewMode: true})
  `)
  t.falsy(res)
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)

  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res.map(normalizeDiff), [
    { change: 'add', path: '/conflict-file.txt', type: 'file' },
    { change: 'add', path: '/conflict-folder', type: 'dir' },
    { change: 'add', path: '/local-file.txt', type: 'file' },
    { change: 'add', path: '/local-folder', type: 'dir' }
  ])
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathFile("${datUrl}", '/conflict-file.txt')`)
  t.deepEqual(res, [ { added: true, count: 1, value: 'local' } ])

  // check content
  t.deepEqual(await readPreviewDatFile('local-file.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-file.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/local-file.txt'), 'local')

  // write to both the archive interface and the local fs
  await mainTab.executeJavascript(`
    (new DatArchive("${previewDatUrl}")).writeFile('conflict-file.txt', 'archive')
  `)
  await dir.write('local-file.txt', 'local2')

  // check content
  t.deepEqual(await readPreviewDatFile('local-file.txt'), 'local2')
  t.deepEqual(await readPreviewDatFile('conflict-file.txt'), 'archive')
  t.deepEqual(await readPreviewDatFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/local-file.txt'), 'local')

  // run diffs
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathListing("${datUrl}")`)
  t.deepEqual(res.map(normalizeDiff), [
    { change: 'add', path: '/conflict-file.txt', type: 'file' },
    { change: 'add', path: '/conflict-folder', type: 'dir' },
    { change: 'add', path: '/local-file.txt', type: 'file' },
    { change: 'add', path: '/local-folder', type: 'dir' }
  ])
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathFile("${datUrl}", '/local-file.txt')`)
  t.deepEqual(res, [ { added: true, count: 1, value: 'local2' } ])
  var res = await mainTab.executeJavascript(`beaker.archives.diffLocalSyncPathFile("${datUrl}", '/conflict-file.txt')`)
  t.deepEqual(res, [ { added: true, count: 1, value: 'archive' } ])

  // end the tmpdat by setting the original dat to auto-sync
  var syncPromises = [
    waitForSync(mainTab, datUrl, 'archive'),
    waitForSync(mainTab, datUrl, 'folder')
  ]
  var res = await mainTab.executeJavascript(`
    beaker.archives.setLocalSyncPath("${datUrl}", "${escapeWindowsSlashes(filePath)}", {previewMode: false})
  `)
  t.falsy(res)
  await Promise.all(syncPromises)

  // check content
  t.deepEqual(await readDatFile('local-file.txt'), 'local2')
  t.deepEqual(await readDatFile('conflict-file.txt'), 'archive')
  t.deepEqual(await readDatFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readDatFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-folder/local-file.txt'), 'local')

  // write to both the archive and the local
  await mainTab.executeJavascript(`beaker.archives.ensureLocalSyncFinished("${datUrl}")`)
  var syncPromises = [
    waitForSync(mainTab, datUrl, 'archive'),
    waitForSync(mainTab, datUrl, 'folder')
  ]
  await mainTab.executeJavascript(`
    (new DatArchive("${datUrl}")).writeFile('conflict-file.txt', 'archive2')
  `)
  await dir.write('local-file.txt', 'local')
  await Promise.all(syncPromises)

  // check content (main dat)
  t.deepEqual(await readDatFile('local-file.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-file.txt'), 'archive')
  t.deepEqual(await readDatFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readDatFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await readDatFile('conflict-folder/local-file.txt'), 'local')

  // check content (preview dat)
  t.deepEqual(await readPreviewDatFile('local-file.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-file.txt'), 'archive')
  t.deepEqual(await readPreviewDatFile('local-folder/file1.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('local-folder/file2.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/file1.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/file2.txt'), 'local')
  t.deepEqual(await readPreviewDatFile('conflict-folder/local-file.txt'), 'local')
})

function normalizeDiff (diff) {
  diff.path = toUnixPath(diff.path)
  return diff
}
import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

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

async function waitForSync (direction) {
  await mainTab.executeJavascript(`
    var resolve
    function onSync ({details}) {
      if (details.url === "${createdDatUrl}" && details.direction === "${direction}") {
        beaker.archives.removeEventListener('folder-sync', onSync)
        resolve()
      }
    }
    beaker.archives.addEventListener('folder-sync', onSync)
    new Promise(r => {resolve = r})
  `)
}

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

  // no sync occurred
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
  await waitForSync('folder')
  await waitForSync('archive')

  // new file was synced
  t.deepEqual(await dir.readAsync('archive-foo.txt'), 'bar')

  // old files were synced
  t.truthy(await dir.existsAsync('dat.json'))

  // modify the file
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'baz')
  `)

  // wait for sync to occur
  await waitForSync('folder')
  await waitForSync('archive')

  // modified file was synced
  t.deepEqual(await dir.readAsync('archive-foo.txt'), 'baz')

  // delete the file
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.unlink('/archive-foo.txt')
  `)

  // wait for sync to occur
  await waitForSync('folder')
  await waitForSync('archive')

  // removed file was synced
  t.falsy(await dir.existsAsync('archive-foo.txt'))
})

test('sync folder->archive on change', async t => {
  const dir = jetpack.cwd(createdFilePath)

  // write a new file
  await dir.writeAsync('local-foo.txt', 'bar')

  // wait for sync to occur
  await waitForSync('archive')

  // new file was synced
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readFile('/local-foo.txt')
  `)
  t.deepEqual(res, 'bar')

  // modify the file
  await dir.writeAsync('local-foo.txt', 'baz')

  // wait for sync to occur
  await waitForSync('archive')

  // modified file was synced
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.readFile('/local-foo.txt')
  `)
  t.deepEqual(res, 'baz')

  // delete the file
  await dir.removeAsync('local-foo.txt')

  // wait for sync to occur
  await waitForSync('archive')

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
  await dir.writeAsync('local-foo.txt', 'bar')

  // write a new file on the archive
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatUrl}")
    archive.writeFile('/archive-foo.txt', 'bar')
  `)

  // wait for sync to occur
  await waitForSync('archive')

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

// because we pass paths through eval() code,
// we need to make windows dir-separators escape properly
// so c:\foo\bar needs to be c:\\foo\\bar
// because without it
// when we eval `act("${path}")`
// it becomes act("c:\foo\bar")
// and it should be act("c:\\foo\\bar")
function escapeWindowsSlashes (str) {
  return str.replace(/\\/g, '\\\\')
}
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
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'),
    beaker_dat_quota_default_bytes_allowed: 1024 * 10 // 10kb
  }
})
var testStaticDat, testStaticDatURL
var testRunnerDat, testRunnerDatURL
var createdDatURL // url of the dat which is created by testRunnerDat, which gives it write access
var createdDatKey
var beakerPng = fs.readFileSync(__dirname + '/scaffold/test-static-dat/beaker.png')

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
test.after.always('cleanup', async t => {
  console.log(JSON.stringify(await app.client.getMainProcessLogs(), null, 2))
  await app.stop()
})

// some custom wrappers around async calls
// (the remove execution can be a little janky, these wrappers solve that)
async function stat (url, path, opts) {
  var res = await app.client.executeAsync((url, path, opts, done) => {
    var archive = new DatArchive(url)
    archive.stat(path, opts).then(v => {
      v.isFile = v.isFile()
      v.isDirectory = v.isDirectory()
      done(stringify(v))
    }, done)
  }, url, path, opts)
  if (typeof res.value === 'string')
    res.value = JSON.parse(res.value)
  return res
}
async function readFile (url, path, opts) {
  return app.client.executeAsync((url, path, opts, done) => {
    var archive = new DatArchive(url)
    archive.readFile(path, opts).then(done, done)
  }, url, path, opts)
}
async function writeFile (url, path, content, opts) {
  return app.client.executeAsync((url, path, content, opts, done) => {
    if (content.data) content = new Uint8Array(content.data) // spectron fucks up our data, unfuck it
    var archive = new DatArchive(url)
    archive.writeFile(path, content, opts).then(done, done)
  }, url, path, content, opts)
}

// tests
//

test('archive.readdir', async t => {
  async function readdir (url, path) {
    return app.client.executeAsync((url, path, done) => {
      var archive = new DatArchive(url)
      archive.readdir(path).then(done, done)
    }, url, path)
  }

  // root dir
  let listing1 = await readdir(testStaticDatURL, '/')
  t.deepEqual(listing1.value.sort(), ['beaker.png', 'hello.txt', 'subdir'])

  // subdir
  let listing2 = await readdir(testStaticDatURL, '/subdir')
  t.deepEqual(listing2.value.sort(), ['hello.txt'])
})

test('archive.readFile', async t => {
  // read utf8
  var helloTxt = await readFile(testStaticDatURL, 'hello.txt', {})
  t.deepEqual(helloTxt.value, 'hello')

  // read utf8 2
  var helloTxt2 = await readFile(testStaticDatURL, '/subdir/hello.txt', 'utf8')
  t.deepEqual(helloTxt2.value, 'hi')

  // read hex
  var beakerPngHex = await readFile(testStaticDatURL, 'beaker.png', 'hex')
  t.deepEqual(beakerPngHex.value, beakerPng.toString('hex'))

  // read base64
  var beakerPngBase64 = await readFile(testStaticDatURL, 'beaker.png', 'base64')
  t.deepEqual(beakerPngBase64.value, beakerPng.toString('base64'))

  // read binary
  var beakerPngBinary = await readFile(testStaticDatURL, 'beaker.png', 'binary')
  t.truthy(beakerPng.equals(Buffer.from(beakerPngBinary.value)))

  // TODO timeouts
  // // timeout: read an archive that does not exist
  // var fakeUrl = 'dat://' + ('f'.repeat(64)) + '/'
  // var entry = await readFile(fakeUrl, 'hello.txt', { timeout: 500 })
  // t.deepEqual(entry.value.name, 'TimeoutError')
})

test('archive.stat', async t => {
  // stat root file
  var entry = await stat(testStaticDatURL, 'hello.txt', {})
  t.deepEqual(entry.value.isFile, true, 'root file')
  t.deepEqual(entry.value.downloaded, entry.value.blocks)

  // stat subdir file
  var entry = await stat(testStaticDatURL, 'subdir/hello.txt', {})
  t.deepEqual(entry.value.isFile, true, 'subdir file')

  // stat subdir
  var entry = await stat(testStaticDatURL, 'subdir', {})
  t.deepEqual(entry.value.isDirectory, true, 'subdir')

  // stat non-existent file
  var entry = await stat(testStaticDatURL, 'notfound', {})
  t.deepEqual(entry.value.name, 'NotFoundError')

  // stat alt-formed path
  var entry = await stat(testStaticDatURL, '/hello.txt', {})
  t.deepEqual(entry.value.isFile, true, 'alt-formed path')

  // TODO
  // timeout: stat an archive that does not exist
  // var fakeUrl = 'dat://' + ('f'.repeat(64)) + '/'
  // var entry = await stat(fakeUrl, 'hello.txt', { timeout: 500 })
  // t.deepEqual(entry.value.name, 'TimeoutError')
})

test('DatArchive.create rejection', async t => {
  // start the prompt
  await app.client.execute(() => {
    // put the result on the window, for checking later
    window.res = null
    DatArchive.create({ title: 'The Title', description: 'The Description' }).then(
      res => window.res = res,
      err => window.res = err
    )
  })

  // reject the prompt
  await app.client.windowByIndex(2)
  await app.client.waitUntilWindowLoaded()
  await app.client.waitForExist('.cancel')
  await app.client.click('.cancel')
  await app.client.windowByIndex(1)

  // fetch & test the res
  await app.client.waitUntil(() => app.client.execute(() => { return window.res != null }))
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.name, 'UserDeniedError')
})

test('DatArchive.create', async t => {
  // start the prompt
  await app.client.execute(() => {
    // put the result on the window, for checking later
    window.res = null
    DatArchive.create({ title: 'The Title', description: 'The Description' }).then(
      res => window.res = res,
      err => window.res = err
    )
  })

  // accept the prompt
  await app.client.windowByIndex(2)
  await app.client.waitUntilWindowLoaded()
  await app.client.waitForExist('button[type="submit"]')
  await app.client.click('button[type="submit"]')
  await app.client.windowByIndex(1)

  // fetch & test the res
  await app.client.pause(500)
  await app.client.waitUntil(() => app.client.execute(() => { return window.res != null }))
  var res = await app.client.execute(() => { return window.res })
  createdDatURL = res.value.url
  t.truthy(createdDatURL.startsWith('dat://'))
  createdDatKey = createdDatURL.slice('dat://'.length)

  // check the dat.json
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.readFile('dat.json').then(done, done)
  }, createdDatURL)
  var manifest
  try {
    var manifest = JSON.parse(res.value)
  } catch (e) {
    console.log('unexpected error parsing manifest', res.value)
  }
  t.deepEqual(manifest.title, 'The Title')
  t.deepEqual(manifest.description, 'The Description')
  t.deepEqual(manifest.createdBy.url, testRunnerDatURL.slice(0, -1))
  t.deepEqual(manifest.createdBy.title, 'Test Runner Dat')

  // check the settings
  await app.client.windowByIndex(0)
  var details = await app.client.executeAsync((key, done) => {
    var archive = new DatArchive(key)
    archive.getInfo().then(done, err => done({ err }))
  }, createdDatKey)
  await app.client.windowByIndex(1)
  t.deepEqual(details.value.userSettings.isSaved, true)
})

test('DatArchive.fork', async t => {
  // start the prompt
  await app.client.execute((url) => {
    // put the result on the window, for checking later
    window.res = null
    DatArchive.fork(url, { description: 'The Description 2' }).then(
      res => window.res = res,
      err => window.res = err
    )
  }, createdDatURL)

  // accept the prompt
  await app.client.windowByIndex(2)
  await app.client.waitUntilWindowLoaded()
  await app.client.waitForExist('button[type="submit"]')
  await app.client.click('button[type="submit"]')
  await app.client.windowByIndex(1)

  // fetch & test the res
  await app.client.pause(500)
  await app.client.waitUntil(() => app.client.execute(() => { return window.res != null }))
  var res = await app.client.execute(() => { return window.res })
  var forkedDatURL = res.value.url
  t.truthy(forkedDatURL.startsWith('dat://'))

  // check the dat.json
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.readFile('dat.json').then(done, done)
  }, forkedDatURL)
  var manifest
  try {
    var manifest = JSON.parse(res.value)
  } catch (e) {
    console.log('unexpected error parsing manifest', res.value)
  }
  t.deepEqual(manifest.title, 'New Title')
  t.deepEqual(manifest.description, 'The Description 2')
  t.deepEqual(manifest.createdBy.url, testRunnerDatURL.slice(0, -1))
  t.deepEqual(manifest.createdBy.title, 'Test Runner Dat')
  t.deepEqual(manifest.forkOf[0].replace(/(\/)$/,''), createdDatURL)
})

test('archive.writeFile', async t => {
  async function dotest (filename, content, encoding) {
    // write to the top-level
    var res = await app.client.executeAsync((url, filename, content, encoding, done) => {
      if (content.data) content = new Uint8Array(content.data) // spectron fucks up our data, unfuck it
      var archive = new DatArchive(url)
      archive.writeFile(filename, content, encoding).then(done, done)
    }, createdDatURL, filename, content, encoding)
    t.falsy(res.value)

    // read it back
    var res = await app.client.executeAsync((url, filename, opts, done) => {
      var archive = new DatArchive(url)
      archive.readFile(filename, opts).then(done, done)
    }, createdDatURL, filename, encoding)
    if (encoding === 'binary') {
      t.truthy(content.equals(Buffer.from(res.value)))
    } else {
      t.deepEqual(res.value, content)
    }
  }

  var beakerPng = fs.readFileSync(__dirname + '/scaffold/test-static-dat/beaker.png')
  await dotest('hello.txt', 'hello world', 'utf8')
  await dotest('beaker1.png', beakerPng, 'binary')
  await dotest('beaker2.png', beakerPng.toString('base64'), 'base64')
  await dotest('beaker3.png', beakerPng.toString('hex'), 'hex')
})

test('archive.writeFile does not write to nonexistent directories', async t => {
  // write to a subdir
  var res = await app.client.executeAsync((url, filename, done) => {
    var archive = new DatArchive(url)
    archive.writeFile(filename, 'hello world', 'utf8').then(done, done)
  }, createdDatURL, 'subdir/hello.txt')
  t.deepEqual(res.value.name, 'ParentFolderDoesntExistError')
})

test('archive.writeFile gives an error for malformed names', async t => {
  // write to the root dir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('/', 'hello world', 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'InvalidPathError')

  // write to a subdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('/subdir/hello.txt/', 'hello world', 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'InvalidPathError')

  // write with a bad char
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('hello`.txt', 'hello world', 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'InvalidPathError')
})

test('archive.writeFile protects the manifest', async t => {
  // write to the manifest
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('dat.json', 'hello world', 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'ProtectedFileNotWritableError')
})

test('archive.mkdir', async t => {
  // create the directory
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('subdir').then(done, done)
  }, createdDatURL)
  t.falsy(res.value)

  // read it back
  var res = await stat(createdDatURL, 'subdir', {})
  t.deepEqual(res.value.isDirectory, true)
})

test('archive.writeFile writes to subdirectories', async t => {
  // write to a subdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('subdir/hello.txt', 'hello world', 'utf8').then(done, done)
  }, createdDatURL)
  t.falsy(res.value)

  // read it back
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.readFile('subdir/hello.txt', 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value, 'hello world')
})

test('archive.writeFile doesnt overwrite folders', async t => {
  // write to the subdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('/subdir', 'hello world', 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'EntryAlreadyExistsError')
})

test('archive.mkdir doesnt overwrite files or folders', async t => {
  // write to the subdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('/').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'EntryAlreadyExistsError')

  // write to the subdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('/subdir').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'EntryAlreadyExistsError')

  // write to the file
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('/hello.txt').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'EntryAlreadyExistsError')
})

test('archive.mkdir gives an error for malformed names', async t => {
  // write with a bad char
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('hello`world').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'InvalidPathError')
})

test('archive.writeFile doesnt allow writes that exceed the quota', async t => {
  // write to the subdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('/denythis.txt', 'x'.repeat(1024 * 12), 'utf8').then(done, done)
  }, createdDatURL)
  t.deepEqual(res.value.name, 'QuotaExceededError')
})

test('archive.writeFile and archive.mkdir fail to write to unowned archives', async t => {
  // writeFile
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('/denythis.txt', 'hello world', 'utf8').then(done, done)
  }, testStaticDatURL)
  t.deepEqual(res.value.name, 'ArchiveNotWritableError')

  // mkdir
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('/denythis').then(done, done)
  }, testStaticDatURL)
  t.deepEqual(res.value.name, 'ArchiveNotWritableError')
})

test('archive.writeFile & archive.mkdir doesnt allow writes to archives until write permission is given', async t => {

  // create the target dat internally, so that it's writable but not owned by the test runner dat
  // =

  await app.client.windowByIndex(0)
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create({ title: 'Another Test Dat' }).then(done, done)
  })
  t.falsy(res.value.name, 'create didnt fail')
  var newTestDatURL = res.value.url
  await app.client.windowByIndex(1)

  // writefile deny
  //

  // start the prompt
  await app.client.execute(url => {
    // put the result on the window, for checking later
    window.res = null
    var archive = new DatArchive(url)
    archive.writeFile('/denythis.txt', 'hello world', 'utf8').then(
      res => window.res = res,
      err => window.res = err
    )
  }, newTestDatURL)

  // accept the prompt
  await app.client.windowByIndex(0)
  await app.client.click('.prompt-reject')
  await app.client.windowByIndex(1)

  // fetch & test the res
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.name, 'UserDeniedError', 'write file denied')

  // mkdir deny
  //

  // start the prompt
  await app.client.execute(url => {
    // put the result on the window, for checking later
    window.res = null
    var archive = new DatArchive(url)
    archive.mkdir('/denythis').then(
      res => window.res = res,
      err => window.res = err
    )
  }, newTestDatURL)

  // accept the prompt
  await app.client.windowByIndex(0)
  await app.client.click('.prompt-reject')
  await app.client.windowByIndex(1)

  // fetch & test the res
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.name, 'UserDeniedError', 'create directory denied')

  // writeFile accept
  // =

  // start the prompt
  await app.client.execute(url => {
    // put the result on the window, for checking later
    window.res = null
    var archive = new DatArchive(url)
    archive.writeFile('/allowthis.txt', 'hello world', 'utf8').then(
      res => window.res = res,
      err => window.res = err
    )
  }, newTestDatURL)

  // accept the prompt
  await app.client.windowByIndex(0)
  await app.client.click('.prompt-accept')
  await app.client.windowByIndex(1)

  // fetch & test the res
  var res = await app.client.execute(() => { return window.res })
  t.falsy(res.value, 'write file accepted')

  // writeFile accept persisted perm
  // =

  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.writeFile('allowthis2.txt', 'hello world', 'utf8').then(done, done)
  }, newTestDatURL)
  t.falsy(res.value, 'write file 2 accepted')

  // mkdir accept persisted perm
  // =

  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.mkdir('allowthis').then(done, done)
  }, newTestDatURL)
  t.falsy(res.value, 'mkdir accepted')
})

test('archive.getInfo', async t => {

  // getInfo gives manifest info and stats
  // =

  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.getInfo({stats: true}).then(done, done)
  }, createdDatURL)
  var info = res.value
  t.deepEqual(info.title, 'New Title')
  t.deepEqual(info.description, 'New Description')
  t.deepEqual(info.createdBy.url, testRunnerDatURL.slice(0, -1))
  t.deepEqual(info.createdBy.title, 'Test Runner Dat')
  t.truthy(info.stats)
  t.truthy(info.stats.meta.blocksTotal)
  t.truthy(info.stats.content.blocksTotal)
  t.deepEqual(info.stats.meta.blocksProgress, info.stats.meta.blocksTotal)
  t.deepEqual(info.stats.content.blocksProgress, info.stats.content.blocksTotal)
})

test('archive.download', async t => {

  // download fetches an individual file
  // =

  // share the test static dat
  var testStaticDat2 = await shareDat(__dirname + '/scaffold/test-static-dat')
  var testStaticDat2URL = 'dat://' + testStaticDat2.archive.key.toString('hex')

  // ensure not yet downloaded
  var res = await stat(testStaticDat2URL, '/hello.txt')
  t.deepEqual(res.value.downloaded, 0)

  // download
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.download('/hello.txt').then(done, done)
  }, testStaticDat2URL)

  // ensure downloaded
  var res = await stat(testStaticDat2URL, '/hello.txt')
  t.deepEqual(res.value.downloaded, res.value.blocks)

  // download fetches an entire folder
  // =

  // share the test static dat
  var testStaticDat3 = await shareDat(__dirname + '/scaffold/test-static-dat')
  var testStaticDat3URL = 'dat://' + testStaticDat3.archive.key.toString('hex')

  // ensure not yet downloaded
  var res = await stat(testStaticDat3URL, '/subdir/hello.txt')
  t.deepEqual(res.value.downloaded, 0)

  // download
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.download('/').then(done, done)
  }, testStaticDat3URL)

  // ensure downloaded
  var res = await stat(testStaticDat3URL, '/subdir/hello.txt')
  t.deepEqual(res.value.downloaded, res.value.blocks)

  // download times out on bad files
  // =

  // download
  var start = Date.now()
  var res = await app.client.executeAsync((url, done) => {
    var archive = new DatArchive(url)
    archive.download('/does-not-exist', {timeout: 500}).then(done, done)
  }, testStaticDat2URL)
  t.truthy(Date.now() - start < 1000)
})

test('DatArchive.importFromFilesystem', async t => {
  // do this in the shell so we dont have to ask permission
  await app.client.windowByIndex(0)

  // import adds all files from target
  // =

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // run import
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.importFromFilesystem({src, dst}).then(done,done)
  }, __dirname + '/scaffold/test-static-dat', archiveURL)
  t.deepEqual(res.value.addedFiles.length, 3)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res.value, 'hello')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res.value, 'hi')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res.value, beakerPng.toString('base64'))

  // non-inplace import adds all files from target to a subdir
  // =

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // run import
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.importFromFilesystem({src, dst, inplaceImport: false}).then(done,done)
  }, __dirname + '/scaffold/test-static-dat', archiveURL)
  t.deepEqual(res.value.addedFiles.length, 3)

  // test files
  var res = await readFile(archiveURL, 'test-static-dat/hello.txt')
  t.deepEqual(res.value, 'hello')
  var res = await readFile(archiveURL, 'test-static-dat/subdir/hello.txt')
  t.deepEqual(res.value, 'hi')
  var res = await readFile(archiveURL, 'test-static-dat/beaker.png', 'base64')
  t.deepEqual(res.value, beakerPng.toString('base64'))

  // ignores file as specified
  // =

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // run import
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.importFromFilesystem({src, dst, ignore: ['**/*.txt']}).then(done,done)
  }, __dirname + '/scaffold/test-static-dat', archiveURL)
  t.deepEqual(res.value.addedFiles.length, 1)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res.value.name, 'NotFoundError')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res.value.name, 'NotFoundError')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res.value, beakerPng.toString('base64'))

  // dry-runs as specified
  // =

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // run import
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.importFromFilesystem({src, dst, dryRun: true}).then(done,done)
  }, __dirname + '/scaffold/test-static-dat', archiveURL)
  t.deepEqual(res.value.addedFiles.length, 3)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res.value.name, 'NotFoundError')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res.value.name, 'NotFoundError')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res.value.name, 'NotFoundError')
})

test('DatArchive.exportToFilesystem', async t => {
  // do this in the shell so we dont have to ask permission
  await app.client.windowByIndex(0)

  // export adds all files to target
  // =

  // create a new dir
  var testDirPath = fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')

  // export files
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.exportToFilesystem({src, dst, skipUndownloadedFiles: false}).then(done,done)
  }, testStaticDatURL, testDirPath)
  t.deepEqual(res.value.addedFiles.length, 3)

  // test files
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'hello.txt'), 'utf8'), 'hello')
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'subdir/hello.txt'), 'utf8'), 'hi')
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'beaker.png'), 'base64'), beakerPng.toString('base64'))

  // ignores file as specified
  // =

  // create a new dir
  var testDirPath = fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')

  // export files
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.exportToFilesystem({src, dst, ignore:['**/*.txt'], skipUndownloadedFiles: false}).then(done,done)
  }, testStaticDatURL, testDirPath)
  t.deepEqual(res.value.addedFiles.length, 1)

  // test files
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'beaker.png'), 'base64'), beakerPng.toString('base64'))
})

test('DatArchive.exportToArchive', async t => {
  // do this in the shell so we dont have to ask permission
  await app.client.windowByIndex(0)

  // export adds all files to target
  // =

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // export files
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.exportToArchive({src, dst, skipUndownloadedFiles: false}).then(done,done)
  }, testStaticDatURL, archiveURL)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res.value, 'hello')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res.value, 'hi')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res.value, beakerPng.toString('base64'))

  // ignores file as specified
  // =

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // export files
  var res = await app.client.executeAsync((src, dst, done) => {
    DatArchive.exportToArchive({src, dst, ignore:['**/*.txt'], skipUndownloadedFiles: false}).then(done,done)
  }, testStaticDatURL, archiveURL)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res.value.name, 'NotFoundError')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res.value.name, 'NotFoundError')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res.value, beakerPng.toString('base64'))
})

test('archive.createFileActivityStream', async t => {
  // do this in the shell so we dont have to ask permission
  await app.client.windowByIndex(0)

  // create a new archive
  var res = await app.client.executeAsync((done) => {
    beaker.archives.create().then(done,done)
  })
  var archiveURL = res.value.url
  t.truthy(archiveURL)

  // start the stream
  app.client.execute(url => {
    window.res = []
    var archive = new DatArchive(url)
    var events = archive.createFileActivityStream()
    events.addEventListener('changed', function ({path}) {
      window.res.push(path)
    })
  }, archiveURL)

  // make changes
  await writeFile(archiveURL, '/a.txt', 'one', 'utf8')
  await writeFile(archiveURL, '/b.txt', 'one', 'utf8')
  await writeFile(archiveURL, '/a.txt', 'one', 'utf8')
  await writeFile(archiveURL, '/a.txt', 'two', 'utf8')
  await writeFile(archiveURL, '/b.txt', 'two', 'utf8')
  await writeFile(archiveURL, '/c.txt', 'one', 'utf8')

  await app.client.waitUntil(() => app.client.execute(() => { return window.res.length == 6 }))
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value, ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt'])
})

test('archive.createNetworkActivityStream', async t => {
  // do this in the shell so we dont have to ask permission
  await app.client.windowByIndex(0)

  // share the test static dat
  var testStaticDat2 = await shareDat(__dirname + '/scaffold/test-static-dat')
  var testStaticDat2URL = 'dat://' + testStaticDat2.archive.key.toString('hex')

  // start the download & network stream
  await app.client.execute(url => {
    window.res = {
      gotPeer: false,
      metadata: {
        down: 0,
        all: false
      },
      content: {
        down: 0,
        all: false
      }
    }
    var archive = new DatArchive(url)
    var events = archive.createNetworkActivityStream()
    events.addEventListener('network-changed', () => {
      window.res.gotPeer = true
    })
    events.addEventListener('download', ({feed}) => {
      window.res[feed].down++
    })
    // events.addEventListener('download-finished', ({feed}) => {
      // window.res[feed].all = true
    // })
    archive.download()
  }, testStaticDat2URL)

  await sleep(500) // couldnt get waitUntil to work, for some reason
  var res = await app.client.execute(() => { return window.res })
  t.deepEqual(res.value.gotPeer, true)
  // t.deepEqual(res.value.metadata.all, true) TODO restore
  // t.deepEqual(res.value.content.all, true) TODO restore
})

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

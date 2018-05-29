import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {shareDat, createDat} from './lib/dat-helpers'
import {toUnixPath} from './lib/test-helpers'

const app = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-'),
    beaker_dat_quota_default_bytes_allowed: '90kb'
  }
})
var mainTab
var testStaticDat, testStaticDatURL
var testRunnerDat, testRunnerDatURL
var createdDatURL // url of the dat which is created by testRunnerDat, which gives it write access
var createdDatKey
var beakerPng = fs.readFileSync(__dirname + '/scaffold/test-static-dat/beaker.png')
var tmpDirPath1 = tempy.directory()

test.before(async t => {
  await app.isReady
  mainTab = app.getTab(0)

  // share the test static dat
  testStaticDat = await shareDat(__dirname + '/scaffold/test-static-dat')
  testStaticDatURL = 'dat://' + testStaticDat.archive.key.toString('hex') + '/'

  // share the test runner dat
  testRunnerDat = await shareDat(__dirname + '/scaffold/test-runner-dat')
  testRunnerDatURL = 'dat://' + testRunnerDat.archive.key.toString('hex') + '/'

  // save the test-runner dat to the library
  var res = await app.executeJavascript(`
    beaker.archives.add("${testRunnerDatURL}")
  `)
  t.deepEqual(res.isSaved, true)

  // open the test-runner dat
  await app.getTab(0).navigateTo(testRunnerDatURL)
})
test.after.always('cleanup', async t => {
  await app.stop()
})

// some custom wrappers around async calls
// (the remove execution can be a little janky, these wrappers solve that)
function stat (url, path, opts) {
  return mainTab.executeJavascript(`
    var archive = new DatArchive("${url}")
    archive.stat("${path}", ${JSON.stringify(opts)}).then(v => {
      v.isFile = v.isFile()
      v.isDirectory = v.isDirectory()
      return v
    })
  `)
}
function readdir (url, path, opts) {
  return mainTab.executeJavascript(`
    var archive = new DatArchive("${url}")
    archive.readdir("${path}", ${JSON.stringify(opts)})
  `)
}
function readFile (url, path, opts) {
  return mainTab.executeJavascript(`
    var archive = new DatArchive("${url}")
    archive.readFile("${path}", ${JSON.stringify(opts)}).then(v => {
      if (v instanceof ArrayBuffer) {
        v = new Uint8Array(v)
      }
      return v
    })
  `)
}
async function writeFile (url, path, content, opts, where) {
  where = where || mainTab
  if (opts === 'binary' || opts.encoding === 'binary') {
    content = content.toString('base64')
    return where.executeJavascript(`
      var content = Uint8Array.from(atob("${content}"), c => c.charCodeAt(0))
      var archive = new DatArchive("${url}")
      archive.writeFile("${path}", content, ${JSON.stringify(opts)})
    `)
  } else {
    return where.executeJavascript(`
      var archive = new DatArchive("${url}")
      archive.writeFile("${path}", "${content}", ${JSON.stringify(opts)})
    `)
  }
}

// tests
//

test('archive.readdir', async t => {
  // root dir
  let listing1 = await readdir(testStaticDatURL, '/')
  t.deepEqual(listing1.sort(), ['beaker.png', 'hello.txt', 'subdir'])

  // subdir
  let listing2 = await readdir(testStaticDatURL, '/subdir')
  t.deepEqual(listing2.sort(), ['hello.txt', 'space in the name.txt'])

  // root dir stat=true
  let listing3 = await readdir(testStaticDatURL, '/', {stat: true})
  listing3 = listing3.sort()
  t.is(listing3[0].name, 'beaker.png')
  t.truthy(listing3[0].stat)
  t.is(listing3[1].name, 'hello.txt')
  t.truthy(listing3[1].stat)
  t.is(listing3[2].name, 'subdir')
  t.truthy(listing3[2].stat)

  // subdir stat=true
  let listing4 = await readdir(testStaticDatURL, '/subdir', {stat: true})
  listing4 = listing4.sort()
  t.is(listing4[0].name, 'hello.txt')
  t.truthy(listing4[0].stat)
  t.is(listing4[1].name, 'space in the name.txt')
  t.truthy(listing4[1].stat)
})

test('archive.readFile', async t => {
  // read utf8
  var helloTxt = await readFile(testStaticDatURL, 'hello.txt', {})
  t.deepEqual(helloTxt, 'hello world')

  // read utf8 2
  var helloTxt2 = await readFile(testStaticDatURL, '/subdir/hello.txt', 'utf8')
  t.deepEqual(helloTxt2, 'hello world')

  // read utf8 when spaces are in the name
  var helloTxt2 = await readFile(testStaticDatURL, '/subdir/space in the name.txt', 'utf8')
  t.deepEqual(helloTxt2, 'hello world')

  // read hex
  var beakerPngHex = await readFile(testStaticDatURL, 'beaker.png', 'hex')
  t.deepEqual(beakerPngHex, beakerPng.toString('hex'))

  // read base64
  var beakerPngBase64 = await readFile(testStaticDatURL, 'beaker.png', 'base64')
  t.deepEqual(beakerPngBase64, beakerPng.toString('base64'))

  // read binary
  var beakerPngBinary = await readFile(testStaticDatURL, 'beaker.png', 'binary')
  t.truthy(beakerPng.equals(Buffer.from(beakerPngBinary)))

  // timeout: read an archive that does not exist
  var fakeUrl = 'dat://' + ('f'.repeat(64)) + '/'
  try {
    await readFile(fakeUrl, 'hello.txt', { timeout: 500 })
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'TimeoutError')
  }
})

test('archive.stat', async t => {
  // stat root file
  var entry = await stat(testStaticDatURL, 'hello.txt', {})
  t.deepEqual(entry.isFile, true, 'root file')
  t.deepEqual(entry.downloaded, entry.blocks)

  // stat subdir file
  var entry = await stat(testStaticDatURL, 'subdir/hello.txt', {})
  t.deepEqual(entry.isFile, true, 'subdir file')

  // stat subdir
  var entry = await stat(testStaticDatURL, 'subdir', {})
  t.deepEqual(entry.isDirectory, true, 'subdir')

  // stat non-existent file
  try {
    var entry = await stat(testStaticDatURL, 'notfound', {})
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }

  // stat alt-formed path
  var entry = await stat(testStaticDatURL, '/hello.txt', {})
  t.deepEqual(entry.isFile, true, 'alt-formed path')

  // stat path w/spaces in it
  var entry = await stat(testStaticDatURL, '/subdir/space in the name.txt', {})
  t.deepEqual(entry.isFile, true, 'path w/spaces in it')

  // stat path w/spaces in it
  var entry = await stat(testStaticDatURL, '/subdir/space%20in%20the%20name.txt', {})
  t.deepEqual(entry.isFile, true, 'path w/spaces in it')

  // timeout: stat an archive that does not exist
  try {
    var fakeUrl = 'dat://' + ('f'.repeat(64)) + '/'
    var entry = await stat(fakeUrl, 'hello.txt', { timeout: 500 })
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'TimeoutError')
  }
})

test('dat:// HEAD and GET', async t => {
  // GET
  var res = await mainTab.executeJavascript(`
    window.fetch("${testStaticDatURL + 'hello.txt'}").then(res => {
      return res.text().then(data => ({data, headers: Array.from(res.headers.entries())}))
    })
  `)
  t.deepEqual(res.data, 'hello world')
  t.deepEqual((res.headers.filter(h => h[0] === 'content-type'))[0][1], 'text/plain; charset=utf8')

  // HEAD
  var res = await mainTab.executeJavascript(`
    window.fetch("${testStaticDatURL + 'hello.txt'}", {method: 'HEAD'}).then(res => {
      return res.text().then(data => ({data, headers: Array.from(res.headers.entries())}))
    })
  `)
  t.deepEqual(res.data, '')
  t.deepEqual((res.headers.filter(h => h[0] === 'content-type'))[0][1], 'text/plain; charset=utf8')
})

test('DatArchive.load', async t => {
  // good url

  var res = await mainTab.executeJavascript(`
    DatArchive.load("${testStaticDatURL}").then(a => a.url)
  `)
  t.deepEqual(res, testStaticDatURL.slice(0, -1))

  // bad url

  try {
    var res = await mainTab.executeJavascript(`
      DatArchive.load('dat://badurl')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidDomainName')
  }
})

test('DatArchive.create prompt=false', async t => {
  // start the permission prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.create({ title: 'The Title', description: 'The Description', links: {foo: 'https://bar.com'}, prompt: false }).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))
  var datKey = datUrl.slice('dat://'.length)

  // check the dat.json
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.readFile('dat.json')
  `)
  var manifest
  try {
    var manifest = JSON.parse(res)
  } catch (e) {
    console.log('unexpected error parsing manifest', res)
  }
  t.deepEqual(manifest.title, 'The Title')
  t.deepEqual(manifest.description, 'The Description')
  t.deepEqual(manifest.links, {foo: [{href: 'https://bar.com'}]})

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${datKey}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.isSaved, true)
})

test('DatArchive.create prompt=true rejection', async t => {
  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: true }).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // reject the prompt
  await app.waitForElement('.cancel')
  await app.click('.cancel')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.deepEqual(res.name, 'UserDeniedError')
})

test('DatArchive.create prompt=true', async t => {
  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: true }).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the prompt
  await app.waitForElement('button[type="submit"]')
  await app.click('button[type="submit"]')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  createdDatURL = res.url
  t.truthy(createdDatURL.startsWith('dat://'))
  createdDatKey = createdDatURL.slice('dat://'.length)

  // check the dat.json
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.readFile('dat.json')
  `)
  var manifest
  try {
    var manifest = JSON.parse(res)
  } catch (e) {
    console.log('unexpected error parsing manifest', res)
  }
  t.deepEqual(manifest.title, 'The Title')
  t.deepEqual(manifest.description, 'The Description')

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${createdDatKey}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.isSaved, true)
})

test('DatArchive.fork prompt=false', async t => {
  // start the permission prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.fork("${createdDatURL}", { description: 'The Description 2', prompt: false }).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  var forkedDatURL = res.url
  t.truthy(forkedDatURL.startsWith('dat://'))

  // check the dat.json
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${forkedDatURL}")
    archive.readFile('dat.json')
  `)
  var manifest
  try {
    var manifest = JSON.parse(res)
  } catch (e) {
    console.log('unexpected error parsing manifest', res)
  }
  t.deepEqual(manifest.title, 'The Title')
  t.deepEqual(manifest.description, 'The Description 2')
})

test('DatArchive.fork prompt=true', async t => {
  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.fork("${createdDatURL}", { description: 'The Description 2', prompt: true }).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the prompt
  await app.waitForElement('button[type="submit"]')
  await app.click('button[type="submit"]')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  var forkedDatURL = res.url
  t.truthy(forkedDatURL.startsWith('dat://'))

  // check the dat.json
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${forkedDatURL}")
    archive.readFile('dat.json')
  `)
  var manifest
  try {
    var manifest = JSON.parse(res)
  } catch (e) {
    console.log('unexpected error parsing manifest', res)
  }
  t.deepEqual(manifest.title, 'The Title')
  t.deepEqual(manifest.description, 'The Description 2')
})

test('DatArchive.unlink', async t => {

  // create a dat

  var res = await app.executeJavascript(`
    DatArchive.create({ title: 'The Title', description: 'The Description', prompt: false })
  `)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))
  var datKey = datUrl.slice('dat://'.length)

  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = 'unset'
    DatArchive.unlink("${datUrl}").then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // fetch & test the res
  await mainTab.waitFor(`(window.res !== 'unset')`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.falsy(res)

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${datKey}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.isSaved, false)

  // dont allow writes
  try {
    var res = await writeFile(datUrl, '/foo.txt', 'bar', 'utf8')
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
})

test('DatArchive.selectArchive rejection', async t => {
  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.selectArchive({ message: 'Help message', buttonLabel: 'button' }).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // reject the prompt
  await app.waitForElement('.cancel')
  await app.click('.cancel')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.deepEqual(res.name, 'UserDeniedError')
})

test('DatArchive.selectArchive: create', async t => {
  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.selectArchive({ message: 'Custom title', buttonLabel: 'button' }).then(
      res => window.res = res.url,
      err => window.res = err
    )
  `)

  // open the create archive view
  await app.waitForElement('.btn[data-content="newArchive"]')
  await app.click('.btn[data-content="newArchive"]')

  // input a title for a now archive
  await app.waitForElement('input[name="title"]')
  await app.setValue('input[name="title"]', 'The Title')

  // accept the prompt
  await app.click('button[type="submit"]')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  var newArchiveURL = res
  t.truthy(res.startsWith('dat://'))

  // check the dat.json
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${newArchiveURL}")
    archive.readFile('dat.json')
  `)
  var manifest
  try {
    var manifest = JSON.parse(res)
  } catch (e) {
    console.log('unexpected error parsing manifest', res)
  }
  t.deepEqual(manifest.title, 'The Title')

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${newArchiveURL}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.isSaved, true)
})

test('DatArchive.selectArchive: select', async t => {
  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.selectArchive().then(
      res => window.res = res.url,
      err => window.res = err
    )
  `)

  // click one of the archives
  var testRunnerDatKey = testRunnerDat.archive.key.toString('hex')
  await app.waitForElement(`li[data-key="${testRunnerDatKey}"]`)
  await app.click(`li[data-key="${testRunnerDatKey}"]`)

  // accept the prompt
  await app.click('button[type="submit"]')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.truthy(res.startsWith('dat://'))
  t.is(res, testRunnerDatURL.slice(0, -1))
})

test('archive.configure', async t => {
  // write the manifest
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.configure({
      title: 'The Changed Title',
      description: 'The Changed Description',
      links: {
        foo: ['https://bar.com', {href: 'https://baz.com'}],
        home: 'dat://beakerbrowser.com'
      }
    })
  `)
  t.falsy(res)

  // read it back
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.getInfo()
  `)
  t.deepEqual(res.title, 'The Changed Title')
  t.deepEqual(res.description, 'The Changed Description')
  t.deepEqual(res.links, {
    foo: [{href: 'https://bar.com'}, {href: 'https://baz.com'}],
    home: [{href: 'dat://beakerbrowser.com'}]
  })
})

test('offline archives', async t => {
  // create a dat (prompt=false)
  var res = await app.executeJavascript(`
    DatArchive.create({ networked: false, prompt: false })
  `)
  var datUrl = res.url
  t.truthy(datUrl.startsWith('dat://'))
  var datKey = datUrl.slice('dat://'.length)

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${datKey}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.networked, false)

  // change the settings
  var res = await app.executeJavascript(`
    var archive = new DatArchive("${datUrl}")
    archive.configure({networked: true})
  `)
  t.falsy(res)

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${datKey}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.networked, true)

  // fork a dat (prompt=false)
  var res = await app.executeJavascript(`
    DatArchive.fork("${datUrl}", { networked: false, prompt: false })
  `)
  var datUrl3 = res.url
  t.truthy(datUrl3.startsWith('dat://'))
  var datKey3 = datUrl3.slice('dat://'.length)

  // check the settings
  var details = await app.executeJavascript(`
    var archive = new DatArchive("${datKey3}")
    archive.getInfo()
  `)
  t.deepEqual(details.userSettings.networked, false)
})

test('archive.writeFile', async t => {
  async function dotest (filename, content, encoding) {
    // write the file
    var res = await writeFile(createdDatURL, filename, content, encoding)
    t.falsy(res)

    // read it back
    var res = await readFile(createdDatURL, filename, encoding)
    if (encoding === 'binary') {
      t.truthy(content.equals(Buffer.from(res)))
    } else {
      t.deepEqual(res, content)
    }
  }

  var beakerPng = fs.readFileSync(__dirname + '/scaffold/test-static-dat/beaker.png')
  await dotest('hello.txt', 'hello world', 'utf8')
  await dotest('beaker1.png', beakerPng, 'binary')
  await dotest('beaker2.png', beakerPng.toString('base64'), 'base64')
  await dotest('beaker3.png', beakerPng.toString('hex'), 'hex')
})

test('archive.writeFile does not write to nonexistent directories', async t => {
  try {
    // write to a subdir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('subdir/hello.txt', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ParentFolderDoesntExistError')
  }
})

test('archive.writeFile gives an error for malformed names', async t => {
  try {
    // write to the root dir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('/', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidPathError')
  }

  try {
    // write to a subdir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('/subdir/hello.txt/', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidPathError')
  }

  try {
    // write with a bad char
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('hello#.txt', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidPathError')
  }
})

test('archive.writeFile protects the manifest', async t => {
  try {
    // write to the manifest
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('dat.json', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ProtectedFileNotWritableError')
  }
})

test('archive.mkdir', async t => {
  // create the directory
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.mkdir('subdir')
  `)
  t.falsy(res)

  // read it back
  var res = await stat(createdDatURL, 'subdir', {})
  t.deepEqual(res.isDirectory, true)
})

test('archive.writeFile writes to subdirectories', async t => {
  // write to a subdir
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.writeFile('subdir/hello.txt', 'hello world', 'utf8')
  `)
  t.falsy(res)

  // read it back
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.readFile('subdir/hello.txt', 'utf8')
  `)
  t.deepEqual(res, 'hello world')
})

test('archive.writeFile doesnt overwrite folders', async t => {
  try {
    // write to the subdir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('/subdir', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'EntryAlreadyExistsError')
  }
})

test('archive.mkdir doesnt overwrite files or folders', async t => {
  try {
    // write to the subdir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.mkdir('/')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'EntryAlreadyExistsError')
  }

  try {
    // write to the subdir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.mkdir('/subdir')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'EntryAlreadyExistsError')
  }

  try {
    // write to the file
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.mkdir('/hello.txt')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'EntryAlreadyExistsError')
  }
})

test('archive.mkdir gives an error for malformed names', async t => {
  try {
    // write with a bad char
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.mkdir('hello#world')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'InvalidPathError')
  }
})

test('archive.writeFile doesnt allow writes that exceed the quota', async t => {
  try {
    // write a too-big file
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.writeFile('/denythis.txt', 'x'.repeat(1024 * 100), 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'QuotaExceededError')
  }
})

test('versioned reads and writes', async t => {
  // create a fresh dat
  var res = await app.executeJavascript(`
    DatArchive.create({title: 'Another Test Dat', prompt: false})
  `)
  t.falsy(res.name, 'create didnt fail')
  var newTestDatURL = res.url

  // do some writes
  await writeFile(newTestDatURL, '/one.txt', 'a', 'utf8', app)
  await writeFile(newTestDatURL, '/two.txt', 'b', 'utf8', app)
  await sleep(1e3) // have to make sure 1s passes for the change to be detected
  await writeFile(newTestDatURL, '/one.txt', 'c', 'utf8', app)

  // check history
  var history = await app.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL}")
    archive.history()
  `)
  if (history.length !== 5) {
    console.log('Weird history', history)
  }
  t.deepEqual(history.length, 5)

  // read back versions
  t.deepEqual((await readdir(newTestDatURL + '+1', '/')).length, 1)
  t.deepEqual((await readdir(newTestDatURL + '+2', '/')).length, 2)
  t.deepEqual((await readdir(newTestDatURL + '+3', '/')).length, 3)
  t.deepEqual((await readFile(newTestDatURL + '+3', '/one.txt')), 'a')
  t.deepEqual((await readFile(newTestDatURL + '+5', '/one.txt')), 'c')
  var statRev2 = await stat(newTestDatURL + '+3', '/one.txt')
  var statRev4 = await stat(newTestDatURL + '+5', '/one.txt')
  t.truthy(statRev2.offset < statRev4.offset)

  // dont allow writes to old versions
  // writeFile
  try {
    var res = await writeFile(newTestDatURL + '+1', '/three.txt', 'foo', 'utf8', app)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
  // mkdir
  try {
    var res = await app.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL + '+1'}")
      archive.mkdir('/foo')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
  // unlink
  try {
    var res = await app.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL + '+1'}")
      archive.unlink('/one.txt')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
  // rmdir
  try {
    var res = await app.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL + '+1'}")
      archive.rmdir('/there-is-no-dir-but-it-doesnt-matter')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
})

test('archive.copy', async t => {
  // file 1
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.copy('/hello.txt', '/hello2.txt')
  `)
  t.falsy(res)
  await t.deepEqual(
    (await readFile(createdDatURL, '/hello.txt')),
    (await readFile(createdDatURL, '/hello2.txt'))
  )

  // file 2
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.copy('/subdir/hello.txt', '/subdir/hello2.txt')
  `)
  t.falsy(res)
  await t.deepEqual(
    (await readFile(createdDatURL, '/subdir/hello.txt')),
    (await readFile(createdDatURL, '/subdir/hello2.txt'))
  )

  // subdir
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.copy('/subdir', '/subdir2')
  `)
  t.falsy(res)
  await t.deepEqual(
    (await readFile(createdDatURL, '/subdir/hello.txt')),
    (await readFile(createdDatURL, '/subdir2/hello.txt'))
  )
  await t.deepEqual(
    (await readFile(createdDatURL, '/subdir/hello2.txt')),
    (await readFile(createdDatURL, '/subdir2/hello2.txt'))
  )
})

test('archive.rename', async t => {
  // file 1
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.rename('/hello2.txt', '/hello-two.txt')
  `)
  t.falsy(res)
  await t.deepEqual(
    (await readFile(createdDatURL, '/hello.txt')),
    (await readFile(createdDatURL, '/hello-two.txt'))
  )

  // file 2
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.rename('/subdir2/hello2.txt', '/subdir2/hello-two.txt')
  `)
  t.falsy(res)
  await t.deepEqual(
    (await readFile(createdDatURL, '/subdir2/hello.txt')),
    (await readFile(createdDatURL, '/subdir2/hello-two.txt'))
  )

  // subdir
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.rename('/subdir2', '/subdir-two')
  `)
  t.falsy(res)
  await t.deepEqual(
    (await readFile(createdDatURL, '/subdir/hello.txt')),
    (await readFile(createdDatURL, '/subdir-two/hello.txt'))
  )
  await t.deepEqual(
    (await readFile(createdDatURL, '/subdir/hello2.txt')),
    (await readFile(createdDatURL, '/subdir-two/hello-two.txt'))
  )
})

test('archive.copy doesnt allow writes that exceed the quota', async t => {
  // start the permission prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    DatArchive.create({title: 'Too Big Dat', prompt: false}).then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.falsy(res.name, 'create didnt fail')
  var newTestDatURL = res.url

  let listing = await readdir(newTestDatURL, '/', {stat: true, recursive: true})

  // write an acceptable (but big) file
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL}")
    archive.writeFile('/bigfile.txt', 'x'.repeat(1024 * 70), 'utf8')
  `)
  t.falsy(res)

  // try to copy the file
  try {
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${newTestDatURL}")
      archive.copy('/bigfile.txt', '/bigfile2.txt')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'QuotaExceededError')
  }
})

test('archive.rename protects the manifest', async t => {
  try {
    // rename the manifest to something else
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.rename('dat.json', 'dat2.json')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ProtectedFileNotWritableError')
  }

  try {
    // rename over the manifest
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.rename('hello.txt', 'dat.json')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'EntryAlreadyExistsError')
  }
})

test('archive.copy protects the manifest', async t => {
  try {
    // copy over the manifest
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${createdDatURL}")
      archive.rename('hello.txt', 'dat.json')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'EntryAlreadyExistsError')
  }
})

test('Fail to write to unowned archives', async t => {
  try {
    // writeFile
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${testStaticDatURL}")
      archive.writeFile('/denythis.txt', 'hello world', 'utf8')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }

  try {
    // mkdir
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${testStaticDatURL}")
      archive.mkdir('/denythis')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }

  try {
    // rename
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${testStaticDatURL}")
      archive.rename('hello.txt', 'denythis.txt')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }

  try {
    // copy
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${testStaticDatURL}")
      archive.copy('hello.txt', 'denythis.txt')
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'ArchiveNotWritableError')
  }
})

test('archive.writeFile & archive.mkdir doesnt allow writes to archives until write permission is given', async t => {

  // create the target dat internally, so that it's writable but not owned by the test runner dat
  // =

  var res = await app.executeJavascript(`
    DatArchive.create({title: 'Another Test Dat', prompt: false})
  `)
  t.falsy(res.name, 'create didnt fail')
  var newTestDatURL = res.url

  // writefile deny
  //

  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    var archive = new DatArchive("${newTestDatURL}")
    archive.writeFile('/denythis.txt', 'hello world', 'utf8').then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // reject the prompt
  await app.waitForElement('.prompt-reject')
  await app.click('.prompt-reject')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.deepEqual(res.name, 'UserDeniedError', 'write file denied')

  // mkdir deny
  //

  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    var archive = new DatArchive("${newTestDatURL}")
    archive.mkdir('/denythis').then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the prompt
  await app.waitForElement('.prompt-reject')
  await app.click('.prompt-reject')

  // fetch & test the res
  await mainTab.waitFor(`window.res`)
  var res = await mainTab.executeJavascript(`window.res`)
  t.deepEqual(res.name, 'UserDeniedError', 'create directory denied')

  // writeFile accept
  // =

  // start the prompt
  mainTab.executeJavascript(`
    // put the result on the window, for checking later
    window.res = null
    var archive = new DatArchive("${newTestDatURL}")
    archive.writeFile('/allowthis.txt', 'hello world', 'utf8').then(
      res => window.res = res,
      err => window.res = err
    )
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')

  // fetch & test the res
  var res = await mainTab.executeJavascript(`window.res`)
  t.falsy(res, 'write file accepted')

  // writeFile accept persisted perm
  // =

  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL}")
    archive.writeFile('allowthis2.txt', 'hello world', 'utf8')
  `)
  t.falsy(res, 'write file 2 accepted')

  // mkdir accept persisted perm
  // =

  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${newTestDatURL}")
    archive.mkdir('allowthis')
  `)
  t.falsy(res, 'mkdir accepted')
})

test('archive.getInfo', async t => {

  // getInfo gives manifest info and stats
  // =

  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.getInfo()
  `)
  var info = res
  t.deepEqual(info.title, 'The Changed Title')
  t.deepEqual(info.description, 'The Changed Description')
})

test('archive.download', async t => {

  // download fetches an individual file
  // =

  // share the test static dat
  var testStaticDat2 = await shareDat(__dirname + '/scaffold/test-static-dat')
  var testStaticDat2URL = 'dat://' + testStaticDat2.archive.key.toString('hex')

  // ensure not yet downloaded
  var res = await stat(testStaticDat2URL, '/hello.txt')
  t.deepEqual(res.downloaded, 0)

  // download
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${testStaticDat2URL}")
    archive.download('/hello.txt')
  `)

  // ensure downloaded
  var res = await stat(testStaticDat2URL, '/hello.txt')
  t.deepEqual(res.downloaded, res.blocks)

  // download fetches an entire folder
  // =

  // share the test static dat
  var testStaticDat3 = await shareDat(__dirname + '/scaffold/test-static-dat')
  var testStaticDat3URL = 'dat://' + testStaticDat3.archive.key.toString('hex')

  // ensure not yet downloaded
  var res = await stat(testStaticDat3URL, '/subdir/hello.txt')
  t.deepEqual(res.downloaded, 0)

  // download
  var res = await mainTab.executeJavascript(`
    var archive = new DatArchive("${testStaticDat3URL}")
    archive.download('/')
  `)

  // ensure downloaded
  var res = await stat(testStaticDat3URL, '/subdir/hello.txt')
  t.deepEqual(res.downloaded, res.blocks)

  // download times out on bad files
  // =

  // download
  var start = Date.now()
  try {
    var res = await mainTab.executeJavascript(`
      var archive = new DatArchive("${testStaticDat2URL}")
      archive.download('/does-not-exist', {timeout: 500})
    `)
    t.fail('Failed to throw')
  } catch (e) {
    t.truthy(Date.now() - start < 1000)
  }
})

test('DatArchive.importFromFilesystem', async t => {
  // import adds all files from target
  // =

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // run import
  var res = await app.executeJavascript(`
    var src = "${escapeWindowsSlashes(path.join(__dirname, 'scaffold', 'test-static-dat'))}"
    var dst = "${archiveURL}"
    DatArchive.importFromFilesystem({src, dst})
  `)
  t.deepEqual(res.addedFiles.length, 4)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res, 'hello world')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res, 'hello world')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res, beakerPng.toString('base64'))

  // non-inplace import adds all files from target to a subdir
  // =

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // run import
  var res = await app.executeJavascript(`
    var src = "${escapeWindowsSlashes(path.join(__dirname, 'scaffold', 'test-static-dat'))}"
    var dst = "${archiveURL}"
    DatArchive.importFromFilesystem({src, dst, inplaceImport: false})
  `)
  t.deepEqual(res.addedFiles.length, 4)

  // test files
  var res = await readFile(archiveURL, 'test-static-dat/hello.txt')
  t.deepEqual(res, 'hello world')
  var res = await readFile(archiveURL, 'test-static-dat/subdir/hello.txt')
  t.deepEqual(res, 'hello world')
  var res = await readFile(archiveURL, 'test-static-dat/beaker.png', 'base64')
  t.deepEqual(res, beakerPng.toString('base64'))

  // ignores file as specified
  // =

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // run import
  var res = await app.executeJavascript(`
    var src = "${escapeWindowsSlashes(path.join(__dirname, 'scaffold', 'test-static-dat'))}"
    var dst = "${archiveURL + '/ignore-import'}"
    DatArchive.importFromFilesystem({src, dst, ignore: ['**/*.txt']})
  `)
  t.deepEqual(res.addedFiles.length, 1)

  // test files
  try {
    var res = await readFile(archiveURL, 'ignore-import/hello.txt')
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }
  try {
    var res = await readFile(archiveURL, 'ignore-import/subdir/hello.txt')
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }
  var res = await readFile(archiveURL, 'ignore-import/beaker.png', 'base64')
  t.deepEqual(res, beakerPng.toString('base64'))
})

test('DatArchive.exportToFilesystem', async t => {
  // export adds all files to target
  // =

  // create a new dir
  var testDirPath = fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')

  // export files
  var res = await app.executeJavascript(`
    var src = "${testStaticDatURL}"
    var dst = "${escapeWindowsSlashes(testDirPath)}"
    DatArchive.exportToFilesystem({src, dst, skipUndownloadedFiles: false})
  `)
  t.deepEqual(res.addedFiles.length, 4)

  // test files
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'hello.txt'), 'utf8'), 'hello world')
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'subdir/hello.txt'), 'utf8'), 'hello world')
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'beaker.png'), 'base64'), beakerPng.toString('base64'))

  // ignores file as specified
  // =

  // create a new dir
  var testDirPath = fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')

  // export files
  var res = await app.executeJavascript(`
    var src = "${testStaticDatURL}"
    var dst = "${escapeWindowsSlashes(testDirPath)}"
    DatArchive.exportToFilesystem({src, dst, ignore:['**/*.txt'], skipUndownloadedFiles: false})
  `)
  t.deepEqual(res.addedFiles.length, 1)

  // test files
  t.deepEqual(fs.readFileSync(path.join(testDirPath, 'beaker.png'), 'base64'), beakerPng.toString('base64'))
})

test('DatArchive.exportToArchive', async t => {
  // export adds all files to target
  // =

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // export files
  var res = await app.executeJavascript(`
    var src = "${testStaticDatURL}"
    var dst = "${archiveURL}"
    DatArchive.exportToArchive({src, dst, skipUndownloadedFiles: false})
  `)

  // test files
  var res = await readFile(archiveURL, 'hello.txt')
  t.deepEqual(res, 'hello world')
  var res = await readFile(archiveURL, 'subdir/hello.txt')
  t.deepEqual(res, 'hello world')
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res, beakerPng.toString('base64'))

  // ignores file as specified
  // =

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // export files
  var res = await app.executeJavascript(`
    var src = "${testStaticDatURL}"
    var dst = "${archiveURL}"
    DatArchive.exportToArchive({src, dst, ignore:['**/*.txt'], skipUndownloadedFiles: false})
  `)

  // test files
  try {
    var res = await readFile(archiveURL, 'hello.txt')
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }
  try {
    var res = await readFile(archiveURL, 'subdir/hello.txt')
    t.fail('Failed to throw')
  } catch (e) {
    t.deepEqual(e.name, 'NotFoundError')
  }
  var res = await readFile(archiveURL, 'beaker.png', 'base64')
  t.deepEqual(res, beakerPng.toString('base64'))
})

test('DatArchive.diff', async t => {
  var changes

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // diff root against empty root, shallow=false, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'add', path: '/hello.txt', type: 'file' },
    { change: 'add', path: '/subdir', type: 'dir' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'add', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))

  // also works with archive inputs
  changes = await app.executeJavascript(`
    var a = new DatArchive("${testStaticDatURL}")
    var b = new DatArchive("${archiveURL}")
    DatArchive.diff(a, b)
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'add', path: '/hello.txt', type: 'file' },
    { change: 'add', path: '/subdir', type: 'dir' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'add', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))

  // diff root against empty root, shallow=true, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}", {shallow: true})
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'add', path: '/hello.txt', type: 'file' },
    { change: 'add', path: '/subdir', type: 'dir' }
  ].sort(sortDiff))

  // diff root against empty root, shallow=false, filter=yes, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}", {paths: ['/hello.txt', '/subdir']})
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'add', path: '/hello.txt', type: 'file' },
    { change: 'add', path: '/subdir', type: 'dir' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'add', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))

  // diff root against empty root, shallow=false, filter=none, ops=del
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}", {ops: ['del']})
  `)
  t.deepEqual(changes.map(massageChangeObj), [
    { change: 'del', path: '/.datignore', type: 'file' }
  ])

  // diff subdir against empty root, shallow=false, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}subdir", "${archiveURL}")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/space in the name.txt', type: 'file' },
    { change: 'add', path: '/hello.txt', type: 'file' }
  ].sort(sortDiff))

  // diff root against nonexistent empty subdir, shallow=false, filter=none, ops=all
  // =

  await t.throws(app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}/subdir")
  `))

  // populate the target archive
  // =

  await app.executeJavascript(`
    var a = new DatArchive("${archiveURL}")
    Promise.all([
      a.writeFile('/hello.txt', 'asdfasdfasdf'),
      a.writeFile('/foo.bar', 'asdfasdf'),
      a.mkdir('/subdir').then(() => {
        return Promise.all([
          a.writeFile('/subdir/hello.txt', 'aasdfasdfs'),
          a.writeFile('/subdir/hello2.txt', 'aasdfasdfs'),
        ])
      }),
      a.mkdir('/subdir2').then(() => {
        return Promise.all([
          a.writeFile('/subdir2/goodbye.txt', 'aasdfasdfs')
        ])
      })
    ])
  `)

  // diff root against populated root, shallow=false, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'del', path: '/foo.bar', type: 'file' },
    { change: 'mod', path: '/hello.txt', type: 'file' },
    { change: 'del', path: '/subdir2/goodbye.txt', type: 'file' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'del', path: '/subdir/hello2.txt', type: 'file' },
    { change: 'mod', path: '/subdir/hello.txt', type: 'file' },
    { change: 'del', path: '/subdir2', type: 'dir' }
  ].sort(sortDiff))

  // diff root against populated root, shallow=true, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}", {shallow: true})
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'del', path: '/foo.bar', type: 'file' },
    { change: 'del', path: '/subdir2', type: 'dir' },
    { change: 'mod', path: '/hello.txt', type: 'file' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'del', path: '/subdir/hello2.txt', type: 'file' },
    { change: 'mod', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))

  // diff root against populated root, shallow=false, filter=yes, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}", {paths: ['/hello.txt', '/subdir']})
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'mod', path: '/hello.txt', type: 'file' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'del', path: '/subdir/hello2.txt', type: 'file' },
    { change: 'mod', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))

  // diff root against populated root, shallow=false, filter=none, ops=mod
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}", {ops: ['del']})
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'del', path: '/foo.bar', type: 'file' },
    { change: 'del', path: '/subdir/hello2.txt', type: 'file' },
    { change: 'del', path: '/subdir2/goodbye.txt', type: 'file' },
    { change: 'del', path: '/subdir2', type: 'dir' }
  ].sort(sortDiff))

  // diff subdir against populated root, shallow=false, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}subdir", "${archiveURL}")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/space in the name.txt', type: 'file' },
    { change: 'del', path: '/foo.bar', type: 'file' },
    { change: 'mod', path: '/hello.txt', type: 'file' },
    { change: 'del', path: '/subdir2/goodbye.txt', type: 'file' },
    { change: 'del', path: '/subdir/hello2.txt', type: 'file' },
    { change: 'del', path: '/subdir/hello.txt', type: 'file' },
    { change: 'del', path: '/subdir2', type: 'dir' },
    { change: 'del', path: '/subdir', type: 'dir' }
  ].sort(sortDiff))

  // diff root against nonexistent populated subdir, shallow=false, filter=none, ops=all
  // =

  changes = await app.executeJavascript(`
    DatArchive.diff("${testStaticDatURL}", "${archiveURL}/subdir")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'del', path: '/hello2.txt', type: 'file' },
    { change: 'add', path: '/subdir', type: 'dir' },
    { change: 'mod', path: '/hello.txt', type: 'file' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'add', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))
})

test('DatArchive.merge', async t => {
  var changes

  // merge into empty
  // =

  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  changes = await app.executeJavascript(`
    DatArchive.merge("${testStaticDatURL}", "${archiveURL}")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'add', path: '/hello.txt', type: 'file' },
    { change: 'add', path: '/subdir', type: 'dir' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'add', path: '/subdir/hello.txt', type: 'file' }
  ].sort(sortDiff))

  t.deepEqual((await readdir(archiveURL, '/')).sort(), [
    'beaker.png',
    'hello.txt',
    'subdir',
    'dat.json'
  ].sort())
  t.deepEqual((await readdir(archiveURL, '/subdir')).sort(), [
    'space in the name.txt',
    'hello.txt'
  ].sort())

  // merge into populated
  // =

  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  archiveURL = res.url
  t.truthy(archiveURL)

  await app.executeJavascript(`
    var a = new DatArchive("${archiveURL}")
    Promise.all([
      a.writeFile('/hello.txt', 'asdfasdfasdf'),
      a.writeFile('/foo.bar', 'asdfasdf'),
      a.mkdir('/subdir').then(() => {
        return Promise.all([
          a.writeFile('/subdir/hello.txt', 'aasdfasdfs'),
          a.writeFile('/subdir/hello2.txt', 'aasdfasdfs'),
        ])
      }),
      a.mkdir('/subdir2').then(() => {
        return Promise.all([
          a.writeFile('/subdir2/goodbye.txt', 'aasdfasdfs')
        ])
      })
    ])
  `)

  changes = await app.executeJavascript(`
    DatArchive.merge("${testStaticDatURL}", "${archiveURL}")
  `)
  t.deepEqual(changes.map(massageChangeObj).sort(sortDiff), [
    { change: 'del', path: '/.datignore', type: 'file' },
    { change: 'add', path: '/beaker.png', type: 'file' },
    { change: 'del', path: '/foo.bar', type: 'file' },
    { change: 'mod', path: '/hello.txt', type: 'file' },
    { change: 'del', path: '/subdir2/goodbye.txt', type: 'file' },
    { change: 'add',
      path: '/subdir/space in the name.txt',
      type: 'file' },
    { change: 'del', path: '/subdir/hello2.txt', type: 'file' },
    { change: 'mod', path: '/subdir/hello.txt', type: 'file' },
    { change: 'del', path: '/subdir2', type: 'dir' }
  ].sort(sortDiff))

  t.deepEqual((await readdir(archiveURL, '/')).sort(), [
    'beaker.png',
    'hello.txt',
    'subdir',
    'dat.json'
  ].sort())
  t.deepEqual((await readdir(archiveURL, '/subdir')).sort(), [
    'space in the name.txt',
    'hello.txt'
  ].sort())

  // cant merge into unowned archive
  // =

  await t.throws(app.executeJavascript(`
    DatArchive.merge("${archiveURL}", "${testStaticDatURL}")
  `))
})

test('archive.watch', async t => {

  // create a new archive
  var res = await app.executeJavascript(`
    DatArchive.create({prompt: false})
  `)
  var archiveURL = res.url
  t.truthy(archiveURL)

  // start the stream
  app.executeJavascript(`
    window.res = []
    var archive = new DatArchive("${archiveURL}")
    var events = archive.watch()
    events.addEventListener('changed', function ({path}) {
      window.res.push(path)
    })
  `)

  // make changes
  await sleep(500) // give stream time to setup
  await writeFile(archiveURL, '/a.txt', 'one', 'utf8', app)
  await writeFile(archiveURL, '/b.txt', 'one', 'utf8', app)
  await writeFile(archiveURL, '/a.txt', 'one', 'utf8', app)
  await writeFile(archiveURL, '/a.txt', 'two', 'utf8', app)
  await writeFile(archiveURL, '/b.txt', 'two', 'utf8', app)
  await writeFile(archiveURL, '/c.txt', 'one', 'utf8', app)
  var res = await app.executeJavascript(`window.res`)
  t.truthy(Array.isArray(res))

  await app.waitFor(`window.res.length == 6`)
  var res = await app.executeJavascript(`window.res`)
  t.deepEqual(res, ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt'])
})

test('archive.writeFile does allow self-modification', async t => {

  // navigate to the created dat
  var tab = await app.newTab()
  await tab.navigateTo(createdDatURL)
  await tab.waitForElement('.entry') // an element on the directory listing page

  // succeed a self-write
  var res = await tab.executeJavascript(`
    var archive = new DatArchive("${createdDatURL}")
    archive.writeFile('/allowthis.txt', 'hello world', 'utf8')
  `)
  t.falsy(res)
})

// TODO why doesnt this work?
test.skip('DatArchive can resolve and read dats with shortnames', async t => {
  var res = await app.executeJavascript(`
    var archive = new DatArchive('dat://beakerbrowser.com/')
    archive.readdir('/')
  `)
  t.truthy(Array.isArray(res))
})

test('network events', async t => {
  // share the test static dat
  var testStaticDat2 = await createDat()
  var testStaticDat2URL = 'dat://' + testStaticDat2.archive.key.toString('hex')

  // start the download & network stream
  app.executeJavascript(`
    window.res = {
      metadata: {
        down: 0,
        all: false
      },
      content: {
        down: 0,
        all: false
      }
    }
    var archive = new DatArchive("${testStaticDat2URL}")
    archive.addEventListener('download', ({feed}) => {
      window.res[feed].down++
    })
    archive.addEventListener('sync', ({feed}) => {
      window.res[feed].all = true
    })
  `)
  await sleep(500) // wait for stream to setup

  // do writes
  await new Promise(resolve => {
    testStaticDat2.importFiles(__dirname + '/scaffold/test-static-dat', resolve)
  })

  // download
  app.executeJavascript(`
    var archive = new DatArchive("${testStaticDat2URL}")
    archive.download()
  `)

  await app.waitFor(`window.res.content.all`)
  var res = await app.executeJavascript(`window.res`)
  t.truthy(res.metadata.down > 0)
  t.truthy(res.content.down > 0)
  t.deepEqual(res.metadata.all, true)
  t.deepEqual(res.content.all, true)
})

function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function sortDiff (a, b) {
  return a.path.localeCompare(b.path)
}

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

function massageChangeObj (c) {
  c.path = toUnixPath(c.path)
  return c
}
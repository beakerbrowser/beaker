import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import {waitForSync, escapeWindowsSlashes} from './lib/test-helpers'
import {swarmDat, shareDat} from './lib/dat-helpers'

const app = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
var createdDatUrl
var createdFilePath = tempy.directory()
var mainTab

test.before(async t => {
  await app.isReady

  // create the test archive
  var res = await app.executeJavascript(`
    DatArchive.create({title: 'Test Archive', description: 'Foo', prompt: false})
  `)
  createdDatUrl = res.url

  // set the sync folder
  var onSync = waitForSync(app, createdDatUrl, 'folder')
  var res = await app.executeJavascript(`
    beaker.archives.setLocalSyncPath("${createdDatUrl}", "${escapeWindowsSlashes(createdFilePath)}")
  `)
  t.falsy(res)
  await onSync

  // go to the site
  mainTab = app.getTab(0)
  await mainTab.navigateTo(createdDatUrl)
})
test.after.always('cleanup', async t => {
  await app.stop()
})

// tests
//

test('experiment must be opted into', async t => {
  // try without experiment set
  try {
    await mainTab.executeJavascript(`
      experimental.capturePage('https://example.com')
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.is(e.name, 'PermissionsError')
  }

  // update manifest to include experiment
  var dir = jetpack.cwd(createdFilePath)
  var manifest = await dir.readAsync('dat.json', 'json')
  manifest.experimental = {apis: ['capturePage']}
  await dir.writeAsync('dat.json', manifest)
  await waitForSync(app, createdDatUrl, 'archive')
})

test('capturePage()', async t => {
  // capture https://example.com
  var png = mainTab.executeJavascript(`
    experimental.capturePage('https://example.com').then(png => ({byteLength: png.byteLength, isArrayBuffer: png instanceof ArrayBuffer}))
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')
  png = await png

  // check results
  t.truthy(png.isArrayBuffer)
  t.truthy(png.byteLength > 0)
})

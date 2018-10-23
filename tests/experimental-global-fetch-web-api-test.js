import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import tempy from 'tempy'
import jetpack from 'fs-jetpack'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
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
var mainTab

test.before(async t => {
  console.log('starting experimental-global-fetch-web-api-test')
  await app.isReady

  // create the test archive
  var res = await app.executeJavascript(`
    DatArchive.create({title: 'Test Archive', description: 'Foo', prompt: false})
  `)
  createdDatUrl = res.url

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
      experimental.globalFetch('https://example.com')
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.is(e.name, 'PermissionsError')
  }

  // update manifest to include experiment
  await app.executeJavascript(`
    (async function () {
      try {
        var archive = new DatArchive("${createdDatUrl}")
        var manifest = JSON.parse(await archive.readFile('dat.json', 'utf8'))
        manifest.experimental = {apis: ['globalFetch']}
        await archive.writeFile('dat.json', JSON.stringify(manifest), 'utf8')
      } catch (e) {
        return e
      }
    })()
  `)
})

test('globalFetch()', async t => {
  // fetch https://example.com (first call)
  var page = mainTab.executeJavascript(`
    experimental.globalFetch('https://example.com').then(res => res.text())
  `)

  // accept the permission prompt
  await app.waitForElement('.prompt-accept')
  await app.click('.prompt-accept')
  page = await page

  // check results
  t.is(typeof page, 'string')
  t.truthy(page.trim().startsWith('<!doctype html>'))

  // fetch https://example.com (second call)
  var page = await mainTab.executeJavascript(`
    experimental.globalFetch('https://example.com').then(res => res.text())
  `)

  // check results
  t.is(typeof page, 'string')
  t.truthy(page.trim().startsWith('<!doctype html>'))
})

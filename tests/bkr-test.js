import test from 'ava'
import {Application} from 'spectron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { exec, execSync } from 'child_process'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'

const app = new Application({
  path: electron,
  args: ['../app'],
  env: { 
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
var datPath1 = gentmp()
var datUrl1
var datPath2 = gentmp()
var datUrl2
var datPath3 = gentmp()

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

// helpers
//

const bkrPath = path.join(__dirname, 'node_modules/bkr/build/bin/bkr')

function bkr (cmd, opts) {
  if (cmd) cmd = ' ' + cmd
  else cmd = ''
  return execSync(bkrPath + cmd, opts).toString()
}

// blasts \n until the child finishes
function bkrAutomatePrompt(cmd, opts) {
  if (cmd) cmd = ' ' + cmd
  else cmd = ''

  return new Promise((resolve, reject) => {
    var interval
    var child = exec(bkrPath + cmd, opts, (err, stdout, stderr) => {
      clearInterval(interval)
      if (err) reject(err)
      else resolve(stdout.toString())
    })
    child.stdin.on('error', ()=>{})
    child.on('close', () => clearInterval(interval))
    interval = setInterval(() => child.stdin.write('\r\n'), 15)
  })
}

function gentmp () {
  return fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
}

// tests
//

test('bkr init', async t => {

  // will create a new dat
  //

  await bkrAutomatePrompt(`init ${datPath1}`)
  var manifest = JSON.parse(fs.readFileSync(path.join(datPath1, 'dat.json')))
  datUrl1 = manifest.url
  t.deepEqual(manifest.title, path.basename(datPath1))
  t.truthy(manifest.url)

})

test('bkr fork', async t => {

  // will create a duplicate with a new url
  // =

  bkr(`fork ${datUrl1} ${datPath2}`)
  await app.client.pause(1000) // need to pause because 'fork' returns before writing files
  var manifest = JSON.parse(fs.readFileSync(path.join(datPath2, 'dat.json')))
  datUrl2 = manifest.url
  t.truthy(datUrl1 !== datUrl2)

})

test('bkr co', async t => {

  // will create a duplicate
  // =

  bkr(`co ${datUrl1} ${datPath3}`)
  var manifest = JSON.parse(fs.readFileSync(path.join(datPath3, 'dat.json')))
  t.truthy(datUrl1.replace(/(\/$)/, '') === manifest.url.replace(/(\/$)/, ''))

  // wont checkout into a populated directory
  // =

  try {
    bkr(`co ${datUrl1} ${datPath3}`)
    t.fail('should not have succeeded')
  } catch (e) {
    t.pass('failed as expected')
  }

})

test('bkr publish', async t => {

  // will publish the given version
  // =

  fs.writeFileSync(path.join(datPath1, 'hello.txt'), 'world', 'utf8')
  await bkrAutomatePrompt(`publish 1.0.0 ${datPath1}`)
  var manifest = JSON.parse(fs.readFileSync(path.join(datPath1, 'dat.json')))
  t.deepEqual(manifest.version, '1.0.0')

  // will publish a major bump
  // =

  fs.writeFileSync(path.join(datPath1, 'hello.txt'), 'universe', 'utf8')
  await bkrAutomatePrompt(`publish major ${datPath1}`)
  var manifest = JSON.parse(fs.readFileSync(path.join(datPath1, 'dat.json')))
  t.deepEqual(manifest.version, '2.0.0')

})

test('bkr pull', async t => {

  // will get the folder up to the latest state
  // =

  bkr(`pull ${datPath3}`)
  var manifest = JSON.parse(fs.readFileSync(path.join(datPath3, 'dat.json')))
  t.deepEqual(manifest.version, '2.0.0')
  t.deepEqual(fs.readFileSync(path.join(datPath3, 'hello.txt'), 'utf8'), 'universe')
})

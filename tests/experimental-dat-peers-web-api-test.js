import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'

const app1 = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
const app2 = browserdriver.start({
  path: electron,
  args: ['../app'],
  env: {
    NODE_ENV: 'test',
    beaker_no_welcome_tab: 1,
    beaker_user_data_path: fs.mkdtempSync(os.tmpdir() + path.sep + 'beaker-test-')
  }
})
var createdDatUrl
var mainTab1
var mainTab2

test.before(async t => {
  console.log('starting experimental-dat-peers-web-api-test')
  await app1.isReady
  await app2.isReady

  // create the test archive
  var res = await app1.executeJavascript(`
    DatArchive.create({title: 'Test Archive', description: 'Foo', prompt: false})
  `)
  createdDatUrl = res.url

  // go to the site
  mainTab1 = app1.getTab(0)
  await mainTab1.navigateTo(createdDatUrl)
  mainTab2 = app2.getTab(0)
  await mainTab2.navigateTo(createdDatUrl)
})
test.after.always('cleanup', async t => {
  await app1.stop()
  await app2.stop()
})

// tests
//

test('experiment must be opted into', async t => {
  // try without experiment set
  try {
    await mainTab1.executeJavascript(`
      experimental.datPeers.list()
    `)
    t.fail('Should have thrown')
  } catch (e) {
    t.is(e.name, 'PermissionsError')
  }

  // update manifest to include experiment
  await app1.executeJavascript(`
    (async function () {
      try {
        var archive = new DatArchive("${createdDatUrl}")
        var manifest = JSON.parse(await archive.readFile('dat.json', 'utf8'))
        manifest.experimental = {apis: ['datPeers']}
        await archive.writeFile('dat.json', JSON.stringify(manifest), 'utf8')
      } catch (e) {
        return e
      }
      return archive.readFile('dat.json', 'utf8')
    })()
  `)

  // make sure the change has made it to browser 2
  await new Promise(resolve => setTimeout(resolve, 1e3))
  var manifest = await app2.executeJavascript(`
    (async function () {
      var archive = new DatArchive("${createdDatUrl}")
      await archive.download('/dat.json')
      return JSON.parse(await archive.readFile('/dat.json', 'utf8'))
    })()
  `)
  t.deepEqual(manifest.experimental, {apis: ['datPeers']})
})

test('datPeers.list() and datPeers.get()', async t => {
  const listPeersCode = `
    (async function () {
      var peers = await experimental.datPeers.list()
      return peers
        .map(p => ({id: p.id, userData: p.userData, send: typeof p.send}))
        .filter(p => !!p.id)
    })()
  `
  const getPeersCode = (id) => `
    (async function () {
      var p = await experimental.datPeers.get("${id}")
      return {id: p.id, userData: p.userData, send: typeof p.send}
    })()
  `

  // list peers in browser 1
  var peers1 = await mainTab1.executeJavascript(listPeersCode)
  t.is(peers1.length, 1)
  t.is(typeof peers1[0].id, 'string')
  t.is(typeof peers1[0].userData, 'undefined')
  t.is(peers1[0].send, 'function')

  // list peers in browser 2
  var peers2 = await mainTab2.executeJavascript(listPeersCode)
  t.is(peers2.length, 1)
  t.is(typeof peers2[0].id, 'string')
  t.is(typeof peers2[0].userData, 'undefined')
  t.is(peers2[0].send, 'function')

  // get peer in browser 1
  var peer1 = await mainTab1.executeJavascript(getPeersCode(peers1[0].id))
  t.is(peer1.id, peers1[0].id)
  t.is(typeof peer1.userData, 'undefined')
  t.is(peer1.send, 'function')

  // get peer in browser 2
  var peer2 = await mainTab2.executeJavascript(getPeersCode(peers2[0].id))
  t.is(peer2.id, peers2[0].id)
  t.is(typeof peer2.userData, 'undefined')
  t.is(peer2.send, 'function')
})

test('datPeers.broadcast() and datPeers.send()', async t => {
  const listenCode = `
    window.messages = []
    experimental.datPeers.addEventListener('message', e => {
      window.messages.push(e.message)
    })
  `
  const broadcastCode = (value) => `
    experimental.datPeers.broadcast({foo: "${value}"})
    experimental.datPeers.broadcast("${value}")
  `
  const sendCode = (value) => `
    (async function () {
      var peers = await experimental.datPeers.list()
      await peers[0].send({foo: "${value}"})
      await peers[0].send("${value}")
    })()
  `
  const getMessagesCode = `
    window.messages
  `

  // setup listeners
  await mainTab1.executeJavascript(listenCode)
  await mainTab2.executeJavascript(listenCode)

  // broadcast and send
  await mainTab1.executeJavascript(broadcastCode('left'))
  await mainTab2.executeJavascript(broadcastCode('right'))
  await mainTab1.executeJavascript(sendCode('left'))
  await mainTab2.executeJavascript(sendCode('right'))

  // give a moment for all messages to arrive
  await new Promise(r => setTimeout(r, 100))

  // check messages
  var messages1 = await mainTab1.executeJavascript(getMessagesCode)
  var messages2 = await mainTab2.executeJavascript(getMessagesCode)
  t.deepEqual(messages2, [
    {foo: "left"},
    "left",
    {foo: "left"},
    "left"
  ])
  t.deepEqual(messages1, [
    {foo: "right"},
    "right",
    {foo: "right"},
    "right"
  ])
})

test('datPeers.setSessionData() and datPeers.getSessionData()', async t => {
  const listenCode = `
    window.sessionDatas = []
    experimental.datPeers.addEventListener('session-data', e => {
      window.sessionDatas.push(e.peer.sessionData)
    })
  `
  const getSessionDataCode = `
    experimental.datPeers.getSessionData()
  `
  const getOtherSessionDataCode = `
    (async function () {
      var peers = await experimental.datPeers.list()
      return peers[0].sessionData
    })()
  `
  const setSessionDataCode = (value) => `
    experimental.datPeers.setSessionData(${JSON.stringify(value)})
  `
  const getSessionDatasCode = `
    window.sessionDatas
  `

  // setup listeners
  await mainTab1.executeJavascript(listenCode)
  await mainTab2.executeJavascript(listenCode)

  // check local session datas
  t.is(await mainTab1.executeJavascript(getSessionDataCode), null)
  t.is(await mainTab2.executeJavascript(getSessionDataCode), null)

  // set session datas
  await mainTab1.executeJavascript(setSessionDataCode({foo: 'left'}))
  await mainTab2.executeJavascript(setSessionDataCode({foo: 'right'}))

  // check local session datas
  t.deepEqual(await mainTab1.executeJavascript(getSessionDataCode), {foo: 'left'})
  t.deepEqual(await mainTab2.executeJavascript(getSessionDataCode), {foo: 'right'})

  // check other session datas
  t.deepEqual(await mainTab1.executeJavascript(getOtherSessionDataCode), {foo: 'right'})
  t.deepEqual(await mainTab2.executeJavascript(getOtherSessionDataCode), {foo: 'left'})

  // set session datas
  await mainTab1.executeJavascript(setSessionDataCode('left'))
  await mainTab2.executeJavascript(setSessionDataCode('right'))

  // check local session datas
  t.deepEqual(await mainTab1.executeJavascript(getSessionDataCode), 'left')
  t.deepEqual(await mainTab2.executeJavascript(getSessionDataCode), 'right')

  // check other session datas
  t.deepEqual(await mainTab1.executeJavascript(getOtherSessionDataCode), 'right')
  t.deepEqual(await mainTab2.executeJavascript(getOtherSessionDataCode), 'left')

  // check events
  var sessionDatas1 = await mainTab1.executeJavascript(getSessionDatasCode)
  var sessionDatas2 = await mainTab2.executeJavascript(getSessionDatasCode)
  sessionDatas1 = removeDuplicates(sessionDatas1) // the event can fire multiple times due to disconnects, so remove dups
  sessionDatas2 = removeDuplicates(sessionDatas2) // the event can fire multiple times due to disconnects, so remove dups
  t.deepEqual(sessionDatas1, [
    {foo: "right"},
    "right"
  ])
  t.deepEqual(sessionDatas2, [
    {foo: "left"},
    "left"
  ])
})

function removeDuplicates (arr) {
  var s = new Set(arr.map(v => JSON.stringify(v)))
  return [...s].map(v => JSON.parse(v))
}

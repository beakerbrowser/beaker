import test from 'ava'
import os from 'os'
import path from 'path'
import fs from 'fs'
import electron from '../node_modules/electron'

import * as browserdriver from './lib/browser-driver'
import { shareDat } from './lib/dat-helpers'

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

test('manage services', async t => {
  // add some services
  var res = await app.executeJavascript(`
    beaker.services.addService('foo.com', {
      title: 'Foo Service',
      description: 'It is foo',
      links: [{
        rel: 'http://api-spec.com/address-book',
        title: 'Foo User Listing API',
        href: '/v1/users'
      }, {
        rel: 'http://api-spec.com/clock',
        title: 'Get-current-time API',
        href: '/v1/get-time'
      }]
    })
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.addService('https://bar.com', {
      title: 'Bar Service',
      description: 'It is bar'
    })
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.addService('baz.com', {
      links: [{
        rel: 'a b c',
        title: 'Got links',
        href: '/href'
      }]
    })
  `)
  t.falsy(res)

  // list services
  var res = await app.executeJavascript(`
    beaker.services.listServices()
  `)
  massageServiceObj(res['foo.com'])
  massageServiceObj(res['bar.com'])
  massageServiceObj(res['baz.com'])
  t.deepEqual(res, {
    'bar.com': {
      accounts: [],
      createdAt: 'number',
      description: 'It is bar',
      hostname: 'bar.com',
      links: [],
      title: 'Bar Service'
    },
    'baz.com': {
      accounts: [],
      createdAt: 'number',
      description: '',
      hostname: 'baz.com',
      links: [
        {href: '/href', rel: 'a', title: 'Got links'},
        {href: '/href', rel: 'b', title: 'Got links'},
        {href: '/href', rel: 'c', title: 'Got links'}
      ],
      title: ''
    },
    'foo.com': {
      accounts: [],
      createdAt: 'number',
      description: 'It is foo',
      hostname: 'foo.com',
      links: [
        {
          href: '/v1/users',
          rel: 'http://api-spec.com/address-book',
          title: 'Foo User Listing API'
        },
        {
          href: '/v1/get-time',
          rel: 'http://api-spec.com/clock',
          title: 'Get-current-time API'
        }
      ],
      title: 'Foo Service'
    }
  })

  // get service
  var res = await app.executeJavascript(`
    beaker.services.getService('https://baz.com')
  `)
  massageServiceObj(res)
  t.deepEqual(res, {
    accounts: [],
    createdAt: 'number',
    description: '',
    hostname: 'baz.com',
    links: [
      {href: '/href', rel: 'a', title: 'Got links'},
      {href: '/href', rel: 'b', title: 'Got links'},
      {href: '/href', rel: 'c', title: 'Got links'}
    ],
    title: ''
  })

  // overwrite service
  var res = await app.executeJavascript(`
    beaker.services.addService('baz.com', {
      links: [{
        rel: 'c d e',
        title: 'Got links 2',
        href: '/href2'
      }]
    })
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.getService('baz.com')
  `)
  massageServiceObj(res)
  t.deepEqual(res, {
    accounts: [],
    createdAt: 'number',
    description: '',
    hostname: 'baz.com',
    links: [
      {href: '/href2', rel: 'c', title: 'Got links 2'},
      {href: '/href2', rel: 'd', title: 'Got links 2'},
      {href: '/href2', rel: 'e', title: 'Got links 2'}
    ],
    title: ''
  })

  // remove service
  var res = await app.executeJavascript(`
    beaker.services.removeService('bar.com')
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.getService('bar.com')
  `)
  t.falsy(res)
})

test('manage accounts', async t => {
  // add some accounts
  var res = await app.executeJavascript(`
    beaker.services.addAccount('foo.com', {username: 'alice', password: 'hunter2'})
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.addAccount('foo.com', {username: 'bob', password: 'hunter2'})
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.addAccount('baz.com', {username: 'alice', password: 'hunter2'})
  `)
  t.falsy(res)

  // list accounts
  var res = await app.executeJavascript(`
    beaker.services.listAccounts()
  `)
  t.deepEqual(res, [
    {serviceHostname: 'foo.com', username: 'alice'},
    {serviceHostname: 'foo.com', username: 'bob'},
    {serviceHostname: 'baz.com', username: 'alice'}
  ])

  // list accounts (rel filter)
  var res = await app.executeJavascript(`
    beaker.services.listAccounts({rel: 'http://api-spec.com/clock'})
  `)
  t.deepEqual(res, [
    {serviceHostname: 'foo.com', username: 'alice'},
    {serviceHostname: 'foo.com', username: 'bob'}
  ])

  // get account
  var res = await app.executeJavascript(`
    beaker.services.getAccount('foo.com', 'alice')
  `)
  t.deepEqual(res, {
    serviceHostname: 'foo.com',
    username: 'alice',
    password: 'hunter2'
  })

  // get service (will now include accounts)
  var res = await app.executeJavascript(`
    beaker.services.getService('https://baz.com')
  `)
  massageServiceObj(res)
  t.deepEqual(res, {
    accounts: [
      {username: 'alice'}
    ],
    createdAt: 'number',
    description: '',
    hostname: 'baz.com',
    links: [
      {href: '/href2', rel: 'c', title: 'Got links 2'},
      {href: '/href2', rel: 'd', title: 'Got links 2'},
      {href: '/href2', rel: 'e', title: 'Got links 2'}
    ],
    title: ''
  })

  // overwrite account
  var res = await app.executeJavascript(`
    beaker.services.addAccount('foo.com', {username: 'alice', password: 'hunter3'})
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.getAccount('foo.com', 'alice')
  `)
  t.deepEqual(res, {
    serviceHostname: 'foo.com',
    username: 'alice',
    password: 'hunter3'
  })

  // remove account
  var res = await app.executeJavascript(`
    beaker.services.removeAccount('foo.com', 'alice')
  `)
  t.falsy(res)
  var res = await app.executeJavascript(`
    beaker.services.getAccount('foo.com', 'alice')
  `)
  t.falsy(res)
})

function massageServiceObj (service) {
  if (!service) return
  service.createdAt = typeof service.createdAt
  service.links.sort((a, b) => a.rel.localeCompare(b.rel))
}

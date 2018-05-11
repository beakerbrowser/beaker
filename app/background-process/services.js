import assert from 'assert'
import {join as joinPaths} from 'path'
import _get from 'lodash.get'
import _set from 'lodash.set'
import * as servicesDb from './dbs/services'
import {request, toOrigin, getAPIPathname} from '../lib/bg/services'
import {URL_HASHBASE, REL_ACCOUNT_API} from '../lib/const'
var debug = require('debug')('beaker-service')

// globals
// =

var debugRequestCounter = 0
var psaDocs = {}
var sessions = {}

// exported api
// =

export async function fetchPSADoc (origin, {noCache} = {}) {
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  origin = toOrigin(origin)

  // check cache
  if (!noCache && origin in psaDocs) {
    return {success: true, statusCode: 200, headers: {}, body: psaDocs[origin]}
  }

  // do fetch
  var n = ++debugRequestCounter
  debug(`Request ${n} origin=${origin} path=${path} method=GET (PSA doc fetch)`)
  var res = await request({
    origin,
    path: '/.well-known/psa'
  })
  debug(`Response ${n} statusCode=${res.statusCode} body=`, res.body)
  if (res.success && res.body && typeof res.body == 'object') {
    let psaDoc = res.body
    psaDocs[origin] = psaDoc
    await servicesDb.addService(origin, psaDoc)
  }
  return res
}

export async function makeAPIRequest ({origin, api, username, method, path, headers, body}) {
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  origin = toOrigin(origin)

  // get params
  try {
    var session = username ? (await getOrCreateSession(origin, username)) : undefined
  } catch (e) {
    return {success: false, statusCode: 0, headers: {}, body: {message: 'Need to log in'}}
  }
  var psaDocResponse = await fetchPSADoc(origin)
  if (!psaDocResponse.success) return psaDocResponse
  var apiPath = getAPIPathname(psaDocResponse.body, api)
  path = path ? joinPaths(apiPath, path) : apiPath

  // make request
  var n = ++debugRequestCounter
  debug(`Request ${n} origin=${origin} path=${path} method=${method} session=${username}`)
  var res = await request({origin, path, method, headers, session}, body)
  debug(`Response ${n} statusCode=${res.statusCode}`)
  return res
}

export async function registerHashbase (body) {
  // make the request
  var n = ++debugRequestCounter
  debug(`Request ${n} origin=${URL_HASHBASE} path=/v2/accounts/register method=POST`)
  var res = await request({
    origin: URL_HASHBASE,
    path: '/v2/accounts/register',
    method: 'POST'
  }, body)
  debug(`Response ${n} statusCode=${res.statusCode}`)

  // add the account on success
  if (res.success) {
    await servicesDb.addAccount(URL_HASHBASE, body.username, body.password)
  }

  return res
}

export async function login (origin, username, password) {
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  origin = toOrigin(origin)

  // make the login request
  var res = await makeAPIRequest({
    origin,
    api: REL_ACCOUNT_API,
    method: 'POST',
    path: '/login',
    body: {username, password}
  })

  // store the session
  if (res.success && res.body && res.body.sessionToken) {
    _set(sessions, [origin, username], res.body.sessionToken)
  }

  return res
}

export async function logout (origin, username) {
  assert(origin && typeof origin === 'string', 'Origin must be a string')
  origin = toOrigin(origin)

  // make the logout request
  var res = await makeAPIRequest({
    origin,
    api: REL_ACCOUNT_API,
    username,
    method: 'POST',
    path: '/logout'
  })

  // clear the session
  _set(sessions, [origin, username], null)

  return res
}

// TODO needed?
// export async function getAccount (origin, username) {
//   assert(origin && typeof origin === 'string', 'Origin must be a string')
//   assert(username && typeof username === 'string', 'Username must be a string')
//   return makeAPIRequest({
//     origin,
//     api: REL_ACCOUNT_API,
//     username,
//     path: '/account'
//   })
// }

// internal methods
// =

async function getOrCreateSession (origin, username) {
  // check cache
  var session = _get(sessions, [origin, username])
  if (session) return session

  // lookup account credentials
  var creds = await servicesDb.getAccount(origin, username)
  if (!creds) {
    throw new Error('Account not found')
  }

  // do login
  var res = await login(origin, creds.username, creds.password)
  return res.body.sessionToken
}

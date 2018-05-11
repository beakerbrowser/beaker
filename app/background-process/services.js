import assert from 'assert'
import {join as joinPaths} from 'path'
import _get from 'lodash.get'
import _set from 'lodash.set'
import * as servicesDb from './dbs/services'
import {request, toHostname, getAPIPathname} from '../lib/bg/services'
import {REL_ACCOUNT_API} from '../lib/const'

// globals
// =

var psaDocs = {}
var sessions = {}

// exported api
// =

export async function fetchPSADoc (hostname, {noCache} = {}) {
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  hostname = toHostname(hostname)

  // check cache
  if (!noCache && hostname in psaDocs) {
    return psaDocs[hostname]
  }

  // do fetch
  var psaDocResponse = await request({
    hostname,
    path: '/.well-known/psa'
  })
  if (psaDocResponse.body && typeof psaDocResponse.body == 'object') {
    psaDocs[hostname] = psaDocResponse.body
    return psaDocResponse.body
  }
  throw new Error('Invalid PSA service description document')
}

export async function makeAPIRequest ({hostname, api, username, method, path, headers, body}) {
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  hostname = toHostname(hostname)

  // get params
  var session = username ? (await getOrCreateSession(hostname, username)) : undefined
  var psaDoc = await fetchPSADoc(hostname)
  var apiPath = getAPIPathname(psaDoc, api)
  path = path ? joinPaths(apiPath, path) : apiPath

  // make request
  return request({hostname, path, method, headers, session}, body)
}

export async function registerHashbase (body) {
  return request({
    hostname: 'hashbase.io',
    path: '/v2/accounts/register',
    method: 'POST'
  }, body)
}

export async function login (hostname, username, password) {
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  assert(username && typeof username === 'string', 'Username must be a string')
  assert(password && typeof password === 'string', 'Password must be a string')
  hostname = toHostname(hostname)

  // make the login request
  var res = await makeAPIRequest({
    hostname,
    api: REL_ACCOUNT_API,
    method: 'POST',
    path: '/login',
    body: {username, password}
  })

  // store the session
  if (res.body && res.body.sessionToken) {
    _set(sessions, [hostname, username], res.body.sessionToken)
  }

  return res
}

export async function logout (hostname, username) {
  assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
  assert(username && typeof username === 'string', 'Username must be a string')
  hostname = toHostname(hostname)

  // make the login request
  var res = await makeAPIRequest({
    hostname,
    api: REL_ACCOUNT_API,
    username,
    method: 'POST',
    path: '/logout'
  })

  // clear the session
  _set(sessions, [hostname, username], null)

  return res
}

// TODO needed?
// export async function getAccount (hostname, username) {
//   assert(hostname && typeof hostname === 'string', 'Hostname must be a string')
//   assert(username && typeof username === 'string', 'Username must be a string')
//   return makeAPIRequest({
//     hostname,
//     api: REL_ACCOUNT_API,
//     username,
//     path: '/account'
//   })
// }

// internal methods
// =

async function getOrCreateSession (hostname, username) {
  // check cache
  var session = _get(sessions, [hostname, username])
  if (session) return session

  // lookup account credentials
  var creds = await servicesDb.getAccount(hostname, username)
  if (!creds) {
    throw new Error('Account not found')
  }

  // do login
  var res = await login(hostname, creds.username, creds.password)
  return res.body.sessionToken
}

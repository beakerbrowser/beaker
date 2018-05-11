import {join as joinPaths} from 'path'
import {DAT_HASH_REGEX, REL_DATS_API} from '../const'

// exported api
// =

export function listAccounts () {
  return beaker.service.listAccounts({api: REL_DATS_API})
}

export async function getAllPins (datUrl) {
  var accounts = await listAccounts()
  return Promise.all(accounts.map(account => getPinAt(account, datUrl)))
}

export function getPinAt (account, datUrl) {
  return beaker.services.makeAPIRequest({
    hostname: account.hostname,
    username: account.username,
    api: REL_DATS_API,
    method: 'GET',
    path: joinPaths('item', urlToKey(datUrl))
  })
}

export function pinDat (account, datUrl, datName) {
  return beaker.services.makeAPIRequest({
    hostname: account.hostname,
    username: account.username,
    api: REL_DATS_API,
    method: 'POST',
    path: '/add',
    body: {
      url: datUrl,
      name: datName
    }
  })
}

export function unpinDat (account, datUrl) {
  return beaker.services.makeAPIRequest({
    hostname: account.hostname,
    username: account.username,
    api: REL_DATS_API,
    method: 'POST',
    path: '/remove',
    body: {
      url: datUrl
    }
  })
}

// internal methods
// =

function urlToKey (url) {
  var match = (url || '').match(DAT_HASH_REGEX)
  if (match) {
    return match[0].toLowerCase()
  }
  return url
}
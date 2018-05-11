import {join as joinPaths} from 'path'
import {DAT_URL_REGEX, REL_DATS_API} from '../const'

// exported api
// =

export function listAccounts () {
  return beaker.services.listAccounts({api: REL_DATS_API})
}

export async function getAllPins (datUrl) {
  var accounts = await listAccounts()
  var pins = await Promise.all(accounts.map(account => getPinAt(account, datUrl)))
  var urls = []
  pins.forEach((pin, i) => {
    accounts[i].isShared = pin.success
    if (!pin.success) return
    accounts[i].datName = pin.body.name
    if (!pin.body || !pin.body.additionalUrls) return
    urls = urls.concat(pin.body.additionalUrls)
  })
  return {accounts, urls}
}

export function getPinAt (account, datUrl) {
  return beaker.services.makeAPIRequest({
    origin: account.origin,
    username: account.username,
    api: REL_DATS_API,
    method: 'GET',
    path: joinPaths('item', urlToKey(datUrl))
  })
}

export function updatePin (account, datUrl, datName) {
  return beaker.services.makeAPIRequest({
    origin: account.origin,
    username: account.username,
    api: REL_DATS_API,
    method: 'POST',
    path: joinPaths('item', urlToKey(datUrl)),
    body: {
      name: datName
    }
  })
}

export function pinDat (account, datUrl, datName) {
  return beaker.services.makeAPIRequest({
    origin: account.origin,
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
    origin: account.origin,
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
  var match = (url || '').match(DAT_URL_REGEX)
  if (match) {
    return match[1].toLowerCase()
  }
  return url
}
import rpc from 'pauls-electron-rpc'

const BEAKER_ORIGIN_REGEX = /^beaker:/i
const DAT_ORIGIN_REGEX = /^(beaker:|dat:)/i
const SECURE_ORIGIN_REGEX = /^(beaker:|dat:|https:|http:\/\/localhost(\/|:))/i

export function internalOnly (event, methodName, args) {
  return test(event, BEAKER_ORIGIN_REGEX)
}

export function datOnly (event, methodName, args) {
  return test(event, DAT_ORIGIN_REGEX)
}

export function secureOnly (event, methodName, args) {
  return test(event, SECURE_ORIGIN_REGEX)
}

function test (event, re) {
  if (!(event && event.sender)) {
    return false
  }
  var url = event.sender.getURL()
  return re.test(url)
}
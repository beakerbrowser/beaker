import rpc from 'pauls-electron-rpc'

export function internalOnly (event, methodName, args) {
  return (event && event.sender && event.sender.getURL().startsWith('beaker:'))
}

export function secureOnly (event, methodName, args) {
  if (!(event && event.sender)) {
    return false
  }
  var url = event.sender.getURL()
  return url.startsWith('beaker:') || url.startsWith('dat:') || url.startsWith('https:')
}
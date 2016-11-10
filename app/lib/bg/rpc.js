import rpc from 'pauls-electron-rpc'

export function internalOnly (event, methodName, args) {
  return (event && event.sender && event.sender.getURL().startsWith('beaker:'))
}
/* Add extra permissions to the navigator.permissions API:
var res = await navigator.permissions.request({ name: 'network', hostname: 'github.com' })
res.status // => 'granted'
res = await navigator.permissions.query({ name: 'network', hostname: 'google.com' })
res.status // => 'blocked'
res = await navigator.permissions.revoke({ name: 'network', hostname: 'github.com' })
res.status // => 'blocked'
*/

import rpc from 'pauls-electron-rpc'
import permissionsManifest from '../lib/api-manifests/external/permissions'

// globals
// =

var origRequest = navigator.permissions.request || (() => Promise.reject(new Error('Invalid permission type')))
var origRevoke = navigator.permissions.revoke
var origQuery = navigator.permissions.query

// this is the actual RPC interface, but we want to expose it via the standard web platform, navigator.permissions
// so, this RPC interface will be kept unexposed to apps
var beakerPermissions = rpc.importAPI('beakerPermissions', permissionsManifest, { timeout: false })

// exported api
// =

export function setup () {
  if (window.location.protocol === 'dat:') {
    // overwrite the permissions APIs
    navigator.permissions.request = customRequest
    navigator.permissions.revoke = customRevoke
    navigator.permissions.query = customQuery
  }
}

function customRequest (descriptor) {
  if (!descriptor) return Promise.reject(new Error('1 Argument required'))

  // custom behaviors
  if (descriptor.name === 'network') {
    // validate and call out to the background process
    if (!validateHostname(descriptor)) return Promise.reject(new Error('Invalid hostname, must be * or a complete hostname, without a protocol scheme'))
    return beakerPermissions.requestPermission(descriptor.name + ':' + descriptor.hostname)
      .then(res => ({ state: (res) ? 'granted' : 'denied' })) // convert the response to look like PermissionStatus
  }

  // default behavior
  return origRequest.call(navigator.permissions, descriptor)
}

function customRevoke (descriptor) {
  if (!descriptor) return Promise.reject(new Error('1 Argument required'))

  // custom behaviors
  if (descriptor.name === 'network') {
    // validate and call out to the background process
    if (!validateHostname(descriptor)) return Promise.reject(new Error('Invalid hostname, must be * or a complete hostname, without a protocol scheme'))
    return beakerPermissions.revokePermission(descriptor.name + ':' + descriptor.hostname)
      .then(res => ({ state: (res) ? 'granted' : 'prompt' })) // convert the response to look like PermissionStatus
  }

  // default behavior
  return origRevoke.call(navigator.permissions, descriptor)
}

function customQuery (descriptor) {
  if (!descriptor) return Promise.reject(new Error('1 Argument required'))

  // custom behaviors
  if (descriptor.name === 'network') {
    // validate and call out to the background process
    if (!validateHostname(descriptor)) return Promise.reject(new Error('Invalid hostname, must be * or a complete hostname, without a protocol scheme'))
    return beakerPermissions.queryPermission(descriptor.name + ':' + descriptor.hostname)
      .then(res => ({ state: (res) ? 'granted' : 'prompt' })) // convert the response to look like PermissionStatus
  }

  // default behavior
  return origQuery.call(navigator.permissions, descriptor)
}

// internal methods
// =

var hostnameRegex = /^(([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/i
function validateHostname (descriptor) {
  if (typeof descriptor.hostname !== 'string' || !(descriptor.hostname === '*' || hostnameRegex.test(descriptor.hostname))) { return false }
  return true
}

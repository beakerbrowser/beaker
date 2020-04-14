import * as base32 from 'base32.js'
import * as crypto from 'crypto'
import { PermissionsError } from 'beaker-error-constants'
import { parseDriveUrl } from '../../lib/urls'

// typedefs
// =

/**
 * @typedef {Object} CapabilityMapping
 * @prop {String} owningOrigin
 * @prop {String} token
 * @prop {Object} target
 * @prop {String} target.key
 * @prop {String} target.version
 */

// globals
// =

/** @type CapabilityMapping[] */
var capabilities = []

// exported api
// =

/**
 * @param {string} capUrl 
 * @returns {CapabilityMapping}
 */
export function lookupCap (capUrl) {
  var token = extractToken(capUrl)
  if (!token) throw new Error('Invalid capability URL')
  return capabilities.find(c => c.token === token)
}

/**
 * @param {String} origin
 * @param {String} target
 * @returns {String}
 */
export function createCap (origin, target) {
  var token = generateToken()
  capabilities.push({
    owningOrigin: origin,
    token,
    target: parseTarget(target)
  })
  return `hyper://${token}.cap/`
}

/**
 * @param {String} origin
 * @param {String} capUrl
 * @param {String} target
 * @returns {Void}
 */
export function modifyCap (origin, capUrl, target) {
  var token = extractToken(capUrl)
  if (!token) throw new Error('Invalid capability URL')
  var cap = capabilities.find(c => c.token === token)
  if (!cap) throw new Error('Capability does not exist')
  
  if (cap.owningOrigin !== origin) {
    throw new PermissionsError('Cannot modify unowned capability')
  }

  cap.target = parseTarget(target)
}

/**
 * @param {String} origin
 * @param {String} capUrl
 * @returns {Void}
 */
export function deleteCap (origin, capUrl) {
  var token = extractToken(capUrl)
  if (!token) throw new Error('Invalid capability URL')
  var capIndex = capabilities.findIndex(c => c.token === token)
  if (capIndex === -1) throw new Error('Capability does not exist')
  
  if (capabilities[capIndex].owningOrigin !== origin) {
    throw new PermissionsError('Cannot modify unowned capability')
  }
  
  capabilities.splice(capIndex, 1)
}

// internal methods
// =

function generateToken () {
  var buf = crypto.randomBytes(8)
  var encoder = new base32.Encoder({type: 'rfc4648', lc: true})
  return encoder.write(buf).finalize()
}

function extractToken (capUrl) {
  var matches = /^(hyper:\/\/)?([a-z0-9]+)\.cap\/?/.exec(capUrl)
  return matches ? matches[2] : undefined
}

function parseTarget (target) {
  try {
    var urlp = parseDriveUrl(target)
    if (urlp.protocol !== 'hyper:') throw new Error()
    return {key: urlp.hostname, version: urlp.version}
  } catch (e) {
    throw new Error('Invalid target hyper:// URL')
  }
}
import { protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'loglevel'
import rpc from 'pauls-electron-rpc'
import globalModulesDir from 'global-modules'
import manifest from './api-manifests/plugin-modules'

// globals
// =

// load all global modules named beaker-plugin-*
var protocolModuleNames = []
try {
  protocolModuleNames = fs.readdirSync(globalModulesDir).filter(name => name.startsWith('beaker-plugin-'))
} catch (e) {}
var protocolModules = protocolModuleNames.map(name => require(path.join(globalModulesDir, name)))

// load builtin
if (!protocolModuleNames.includes('beaker-plugin-dat'))
  protocolModules.push(require('beaker-plugin-dat'))
if (!protocolModuleNames.includes('beaker-plugin-ipfs'))
  protocolModules.push(require('beaker-plugin-ipfs'))


// exported api
// =

export function setup () {
  rpc.exportAPI('beakerPluginModules', manifest, { getProtocolDescription, getHomePages })
}

// fetch a complete listing of the protocol descriptions
// - each module can export arrays of values. this is a helper to create 1 list of all of them
var caches = {}
export function getAll (key) {
  // use cached
  if (caches[key])
    return caches[key]

  // construct
  caches[key] = []
  protocolModules.forEach(protocolModule => {
    if (!protocolModule[key])
      return

    // get the values from the module
    var values = protocolModule[key]
    if (!Array.isArray(values))
      values = [values]

    // add to list
    caches[key] = caches[key].concat(values)
  })
  return caches[key]
}

// register the protocols that have standard-url behaviors
// - must be called before app 'ready'
export function registerStandardSchemes () {
  var protos = getAll('protocols')

  // get the protocols that are 'standard'
  var standardSchemes = protos.filter(desc => desc.isStandardURL).map(desc => desc.scheme)

  // register
  protocol.registerStandardSchemes(standardSchemes)
}

// register all protocol handlers
export function setupProtocolHandlers () {
  getAll('protocols').forEach(proto => {
    // run the module's protocol setup
    log.debug('Registering protocol handler:', proto.scheme)
    proto.register()
  })
}

// setup all web APIs
export function setupWebAPIs () {
  getAll('webAPIs').forEach(api => {
    // run the module's protocol setup
    log.debug('Wiring up Web API:', api.name)
    rpc.exportAPI(api.name, api.manifest, api.methods)
  })
}

// get web API manifests for the given protocol
export function getWebAPIManifests (scheme) {
  var manifests = {}

  // massage input
  scheme = scheme.replace(/:/g, '')

  // get the protocol description
  var proto = getAll('protocols').find(proto => proto.scheme == scheme)
  if (!proto)
    return manifests

  // collect manifests
  getAll('webAPIs').forEach(api => {
    // just need to match isInternal for the api and the scheme
    if (api.isInternal == proto.isInternal)
      manifests[api.name] = api.manifest
  })
  return manifests
}

// get the home-page listing
export function getHomePages () {
  return getAll('homePages')
}

// get the description for a given scheme
export function getProtocolDescription (scheme) {
  // massage input
  scheme = scheme.replace(/:/g, '')

  // find desc
  return getAll('protocols').find(proto => proto.scheme == scheme)
}
import { app, protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'loglevel'
import npm from 'npm'
import rpc from 'pauls-electron-rpc'
import emitStream from 'emit-stream'

// globals
// =

const PLUGIN_NODE_MODULES_PREFIX = app.getPath('userData')
const PLUGIN_NODE_MODULES = path.join(PLUGIN_NODE_MODULES_PREFIX, 'node_modules')

// find all modules named beaker-plugin-*
var protocolModuleNames = []
try { protocolModuleNames = fs.readdirSync(PLUGIN_NODE_MODULES).filter(name => name.startsWith('beaker-plugin-')) }
catch (e) {}

// load the plugin modules
var protocolModules = []
var protocolPackageJsons = {}
protocolModuleNames.forEach(name => {
  // load module
  protocolModules.push(require(path.join(PLUGIN_NODE_MODULES, name)))

  // load package.json
  loadPackageJson(name)
})

// configure embedded npm
npm.load({
  prefix: PLUGIN_NODE_MODULES_PREFIX
})

// exported api
// =

// list the installed plugins
export function list () {
  return Promise.resolve(protocolPackageJsons)
}

// lookup a plugin in npm
export function lookup (name) {
  return new Promise((resolve, reject) => {
    // run `npm view`
    npm.commands.view([name], (err, desc) => {
      if (err) reject(err)
      else resolve(desc)
    })
  })
}

// install a new plugin
export function install (name) {
  return new Promise((resolve, reject) => {
    // sanity check
    if (!protocolPackageJsons[name])
      reject(new Error('Module already installed'))

    // add placeholder plugin status
    protocolPackageJsons[name] = {
      name,
      status: 'installing'
    }

    // run `npm install`
    npm.commands.install([name], (err, res) => {
      if (err) reject(err)
      else {
        // load the package.json and set status
        loadPackageJson(name)
        protocolPackageJsons[name].status = 'done-installing'

        // resolve
        resolve(res)
      }
    })
  })
}
// uninstall a plugin
export function uninstall (name) {
  return new Promise((resolve, reject) => {
    // sanity check
    if (!protocolPackageJsons[name])
      reject(new Error('Module not installed'))

    // update plugin status
    protocolPackageJsons[name].status = 'uninstalling'

    // run `npm uninstall`
    npm.commands.uninstall([name], (err, res) => {
      if (err) reject(err)
      else {
        protocolPackageJsons[name].status = 'done-uninstalling'
        resolve(res)
      }
    })
  })
}

// check all installed plugins for new versions
export function checkForUpdates () {
  return Promise.reject(new Error('todo'))  
}

// fetch a complete listing of the plugin info
// - each plugin module can export arrays of values. this is a helper to create 1 list of all of them
var caches = {}
export function getAllInfo (key) {
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
  var protos = getAllInfo('protocols')

  // get the protocols that are 'standard'
  var standardSchemes = protos.filter(desc => desc.isStandardURL).map(desc => desc.scheme)

  // register
  protocol.registerStandardSchemes(standardSchemes)
}

// register all protocol handlers
export function setupProtocolHandlers () {
  getAllInfo('protocols').forEach(proto => {
    // run the module's protocol setup
    log.debug('Registering protocol handler:', proto.scheme)
    proto.register()
  })
}

// setup all web APIs
export function setupWebAPIs () {
  getAllInfo('webAPIs').forEach(api => {
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
  var proto = getAllInfo('protocols').find(proto => proto.scheme == scheme)
  if (!proto)
    return manifests

  // collect manifests
  getAllInfo('webAPIs').forEach(api => {
    // just need to match isInternal for the api and the scheme
    if (api.isInternal == proto.isInternal)
      manifests[api.name] = api.manifest
  })
  return manifests
}

// internal methods
// =

function loadPackageJson (name) {
  var packageJson
  try { packageJson = extractPackageJsonAttrs(require(path.join(PLUGIN_NODE_MODULES, name, 'package.json'))) }
  catch (e) { packageJson = { name: name, status: 'installed' } }
  protocolPackageJsons[name] = packageJson
}

function extractPackageJsonAttrs (packageJson) {
  return {
    name: packageJson.name,
    author: packageJson.author,
    description: packageJson.description,
    homepage: packageJson.homepage,
    version: packageJson.version,
    status: 'installed'
  }
}
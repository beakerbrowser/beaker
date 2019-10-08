import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'type-registry'})
import dat from '../dat/index'
import * as filesystem from './index'
import * as programRegistry from './program-registry'
import { PATHS } from '../../lib/const'
import _cloneDeep from 'lodash.clonedeep'
import lock from '../../lib/lock'

// typedefs
//

/**
 * @typedef {Object} InstalledTypePackage
 * @prop {string} url
 * @prop {string} key
 * @prop {string} version
 * @prop {object} manifest
 * 
 * @typedef {Object} DriveType
 * @prop {string} id
 * @prop {string} title
 * @prop {Object} origin
 * @prop {string} origin.url
 * @prop {string} origin.title
 * @prop {string} origin.type
 */

// globals
// =

var installedTypePackages = undefined
var driveHandlers = undefined

// exported api
// =

export const WEBAPI = {
  listDriveTypes,
  listTypePackages,
  getTypePackage,
  installTypePackage,
  uninstallTypePackage,
  listDriveHandlers,
  getDriveHandler,
  setDriveHandler
}

/**
 * @returns {Promise<DriveType[]>}
 */
export async function listDriveTypes () {
  await ensureLoaded()
  var types = []

  // installed type packages
  for (let pkg of installedTypePackages) {
    if (!pkg.manifest || typeof pkg.manifest !== 'object') continue
    if (!pkg.manifest.type || typeof pkg.manifest.type !== 'string') continue
    if (!pkg.manifest.title || typeof pkg.manifest.title !== 'string') continue
    if (!Array.isArray(pkg.manifest.driveTypes)) continue
    
    for (let t of pkg.manifest.driveTypes) {
      if (!t || typeof t !== 'object') continue
      if (!t.id || typeof t.id !== 'string') continue
      if (!t.title || typeof t.title !== 'string') continue
      if (types.find(t2 => t.id === t2.id)) continue // avoid duplicates

      types.push({
        origin: {
          url: pkg.url,
          title: pkg.manifest.title,
          type: pkg.manifest.type,
        },
        id: t.id,
        title: t.title
      })
    }
  }

  // installed application types
  let installedPrograms = await programRegistry.listPrograms({type: 'application'})
  for (let program of installedPrograms) {
    if (!program.manifest || typeof program.manifest !== 'object') continue
    if (!program.manifest.type || typeof program.manifest.type !== 'string') continue
    if (!program.manifest.title || typeof program.manifest.title !== 'string') continue
    if (!program.manifest.application || typeof program.manifest.application !== 'object') continue
    if (!Array.isArray(program.manifest.application.driveTypes)) continue

    for (let t of program.manifest.application.driveTypes) {
      if (!t || typeof t !== 'object') continue
      if (!t.id || typeof t.id !== 'string') continue
      if (!t.title || typeof t.title !== 'string') continue
      if (types.find(t2 => t.id === t2.id)) continue // avoid duplicates

      types.push({
        origin: {
          url: program.url,
          title: program.manifest.title,
          type: program.manifest.type,
        },
        id: t.id,
        title: t.title
      })
    }
  }

  return types
}

/**
 * @returns {Promise<InstalledTypePackage[]>}
 */
export async function listTypePackages () {
  await ensureLoaded()
  return _cloneDeep(installedTypePackages)
}

/**
 * @param {string} url 
 * @returns {Promise<InstalledTypePackage>}
 */
export async function getTypePackage (url) {
  await ensureLoaded()
  url = normalizeUrl(url)
  return _cloneDeep(installedTypePackages.find(p => normalizeUrl(p.url) === url))
}

/**
 * @param {string} url 
 * @param {number|string} version 
 * @returns {Promise<void>}
 */
export async function installTypePackage (url, version) {
  await ensureLoaded()
  url = normalizeUrl(url)
  var key = dat.archives.fromURLToKey(url)
  logger.info('Installing type package', {url, key, version})

  var archive = await dat.archives.getOrLoadArchive(key)
  var checkout = version ? await dat.archives.getArchiveCheckout(archive, version) : archive
  if (!version) version = (await archive.getInfo()).version
  var manifest = await checkout.pda.readFile('dat.json', 'utf8')
  manifest = JSON.parse(manifest)

  if (await getTypePackage(url)) {
    installedTypePackages = installedTypePackages.filter(p => normalizeUrl(p.url) !== url)
  }
  installedTypePackages.push({
    url,
    key,
    version,
    manifest
  })
  await persist()

  logger.verbose('Successfully installed type package', {url, key, version})
}

/**
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function uninstallTypePackage (url) {
  await ensureLoaded()
  url = normalizeUrl(url)
  logger.info('Uninstalling type package', {url})

  installedTypePackages = installedTypePackages.filter(p => normalizeUrl(p.url) !== url)
  await persist()

  logger.verbose('Successfully uninstalled type package', {url})  
}

/**
 * @returns {Promise<Object>}
 */
export async function listDriveHandlers () {
  await ensureLoaded()
  return _cloneDeep(driveHandlers)
}

/**
 * @param {string} typeId 
 * @returns {Promise<string>}
 */
export async function getDriveHandler (typeId) {
  await ensureLoaded()
  return driveHandlers[typeId]
}

/**
 * @param {string} typeId 
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function setDriveHandler (typeId, url) {
  await ensureLoaded()
  logger.info('Setting drive handler', {type: typeId, handler: url})
  driveHandlers[typeId] = normalizeUrl(url)
  await persist()
}

// internal methods
// =

/**
 * @returns {Promise<void>}
 */
async function ensureLoaded () {
  if (installedTypePackages) return
  var release = await lock('access:type-registry')
  try {
    var typeRegistryStr
    try {
      typeRegistryStr = await filesystem.get().pda.readFile(PATHS.TYPE_REGISTRY_JSON)
    } catch (e) {
      // dne
    }

    // parse & validate
    if (typeRegistryStr) {
      try {
        let typeRegistryObj = JSON.parse(typeRegistryStr)
        installedTypePackages = (Array.isArray(typeRegistryObj.installed) ? typeRegistryObj.installed : []).filter(pkg => (
          !!pkg
          && typeof pkg === 'object'
          && typeof pkg.url === 'string'
        ))
        driveHandlers = typeRegistryObj.driveHandlers && typeof typeRegistryObj.driveHandlers === 'object' ? typeRegistryObj.driveHandlers : {}
      } catch (e) {
        logger.error(`Invalid ${PATHS.TYPE_REGISTRY_JSON} file`, {error: e})
        logger.error(`A new ${PATHS.TYPE_REGISTRY_JSON} will be created and the previous file will be saved as ${PATHS.TYPE_REGISTRY_JSON}.backup`)
        await filesystem.get().pda.rename(PATHS.TYPE_REGISTRY_JSON, PATHS.TYPE_REGISTRY_JSON + '.backup')
      }
    }
  } finally {
    release()
  }
}

/**
 * @returns {Promise<void>}
 */
async function persist () {
  var release = await lock('access:type-registry')
  try {
    await filesystem.get().pda.writeFile(PATHS.TYPE_REGISTRY_JSON, JSON.stringify({
      type: 'type-registry',
      installed: installedTypePackages,
      driveHandlers
    }, null, 2))
  } catch (e) {
    logger.error('Failed to persist type registry', {error: e})
    throw e
  } finally {
    release()
  }
}

/**
 * @param {string} url 
 * @returns {string}
 */
function normalizeUrl (url) {
  try {
    var urlp = new URL(url)
    return (urlp.protocol + '//' + urlp.hostname).replace(/([/]$)/g, '')
  } catch (e) {}
  return url
}
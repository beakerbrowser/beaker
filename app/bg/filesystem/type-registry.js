import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'type-registry'})
import dat from '../dat/index'
import * as filesystem from './index'
import * as programRegistry from './program-registry'
import { PATHS } from '../../lib/const'
import _get from 'lodash.get'
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
 * @prop {string} defaultHandler
 * @prop {DriveHandler[]} handlers
 * 
 * @typedef {Object} DriveHandler
 * @prop {string} url
 * @prop {string} title
 */

// exported api
// =

export const WEBAPI = {
  listDriveTypes,
  listTypePackages,
  getTypePackage,
  installTypePackage,
  uninstallTypePackage,
  getDriveHandlers,
  getDefaultDriveHandler,
  setDefaultDriveHandler
}

/**
 * @returns {Promise<DriveType[]>}
 */
export async function listDriveTypes () {
  var {installedTypePackages, defaultDriveHandlers} = await load()
  var types = []

  const getDefaultDriveHandler = typeId => defaultDriveHandlers[typeId] || 'system'

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
        title: t.title,
        defaultHandler: getDefaultDriveHandler(t.id),
        handlers: await getDriveHandlers(t.id)
      })
    }
  }

  // installed application types
  let installedPrograms = await programRegistry.listPrograms({type: 'application'})
  for (let program of installedPrograms) {
    if (!program.manifest || typeof program.manifest !== 'object') continue
    if (!program.manifest.type || typeof program.manifest.type !== 'string') continue
    if (!program.manifest.title || typeof program.manifest.title !== 'string') continue
    if (!Array.isArray(program.manifest.driveTypes)) continue

    for (let t of program.manifest.driveTypes) {
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
        title: t.title,
        defaultHandler: getDefaultDriveHandler(t.id),
        handlers: await getDriveHandlers(t.id)
      })
    }
  }

  return types
}

/**
 * @returns {Promise<InstalledTypePackage[]>}
 */
export async function listTypePackages () {
  var {installedTypePackages} = await load()
  return installedTypePackages
}

/**
 * @param {string} url 
 * @returns {Promise<InstalledTypePackage>}
 */
export async function getTypePackage (url) {
  var {installedTypePackages} = await load()
  url = normalizeUrl(url)
  return installedTypePackages.find(p => normalizeUrl(p.url) === url)
}

/**
 * @param {string} url 
 * @param {number|string} version 
 * @returns {Promise<void>}
 */
export async function installTypePackage (url, version) {
  var release = await lock('update:type-registry')
  try {
    url = normalizeUrl(url)
    var key = dat.archives.fromURLToKey(url)
    logger.info('Installing type package', {url, key, version})

    var archive = await dat.archives.getOrLoadArchive(key)
    var checkout = version ? await dat.archives.getArchiveCheckout(archive, version) : archive
    if (!version) version = (await archive.getInfo()).version
    var manifest = await checkout.pda.readFile('dat.json', 'utf8')
    manifest = JSON.parse(manifest)

    var {installedTypePackages, defaultDriveHandlers} = await load()
    if (await getTypePackage(url)) {
      installedTypePackages = installedTypePackages.filter(p => normalizeUrl(p.url) !== url)
    }
    installedTypePackages.push({
      url,
      key,
      version,
      manifest
    })
    await persist({installedTypePackages, defaultDriveHandlers})

    logger.verbose('Successfully installed type package', {url, key, version})
  } finally {
    release()
  }
}

/**
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function uninstallTypePackage (url) {
  var release = await lock('update:type-registry')
  try {
    url = normalizeUrl(url)
    logger.info('Uninstalling type package', {url})

    var {installedTypePackages, defaultDriveHandlers} = await load()
    installedTypePackages = installedTypePackages.filter(p => normalizeUrl(p.url) !== url)
    await persist({installedTypePackages, defaultDriveHandlers})

    logger.verbose('Successfully uninstalled type package', {url})  
  } finally {
    release()
  }
}

/**
 * @param {string} typeId 
 * @returns {Promise<DriveHandler[]>}
 */
export async function getDriveHandlers (typeId) {
  var programs = await programRegistry.listPrograms({handlesDriveType: typeId})
  return programs.map(program => ({
    url: program.url,
    title: _get(program, 'manifest.title', '')
  })).concat([{url: 'system', title: 'System'}])
}

/**
 * @param {string} typeId 
 * @returns {Promise<string>}
 */
export async function getDefaultDriveHandler (typeId) {
  var {defaultDriveHandlers} = await load()
  return defaultDriveHandlers[typeId] || 'system'
}

/**
 * @param {string} typeId 
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function setDefaultDriveHandler (typeId, url) {
  var release = await lock('update:type-registry')
  try {
    var {installedTypePackages, defaultDriveHandlers} = await load()
    logger.info('Setting drive handler', {type: typeId, handler: url})
    defaultDriveHandlers[typeId] = normalizeUrl(url)
    await persist({installedTypePackages, defaultDriveHandlers})
  } finally {
    release()
  }
}

/**
 * @param {string} typeId 
 * @returns {Promise<void>}
 */
export async function unsetDefaultDriveHandler (typeId) {
  var release = await lock('update:type-registry')
  try {
    var {installedTypePackages, defaultDriveHandlers} = await load()
    logger.info('Unsetting drive handler', {type: typeId})
    delete defaultDriveHandlers[typeId]
    await persist({installedTypePackages, defaultDriveHandlers})
  } finally {
    release()
  }
}

// internal methods
// =

/**
 * @returns {Promise<Object>}
 */
async function load () {
  var release = await lock('access:type-registry')
  var installedTypePackages = []
  var defaultDriveHandlers = {}
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
        defaultDriveHandlers = typeRegistryObj.defaultDriveHandlers && typeof typeRegistryObj.defaultDriveHandlers === 'object' ? typeRegistryObj.defaultDriveHandlers : {}
      } catch (e) {
        logger.error(`Invalid ${PATHS.TYPE_REGISTRY_JSON} file`, {error: e})
        logger.error(`A new ${PATHS.TYPE_REGISTRY_JSON} will be created and the previous file will be saved as ${PATHS.TYPE_REGISTRY_JSON}.backup`)
        await filesystem.get().pda.rename(PATHS.TYPE_REGISTRY_JSON, PATHS.TYPE_REGISTRY_JSON + '.backup')
      }
    }
  } finally {
    release()
  }
  return {installedTypePackages, defaultDriveHandlers}
}

/**
 * @returns {Promise<void>}
 */
async function persist ({installedTypePackages, defaultDriveHandlers}) {
  var release = await lock('access:type-registry')
  try {
    await filesystem.get().pda.writeFile(PATHS.TYPE_REGISTRY_JSON, JSON.stringify({
      type: 'type-registry',
      installed: installedTypePackages,
      defaultDriveHandlers
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
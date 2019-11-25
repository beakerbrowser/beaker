import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'type-registry'})
import * as filesystem from './index'
import * as programRegistry from './program-registry'
import { PATHS } from '../../lib/const'
import _get from 'lodash.get'
import lock from '../../lib/lock'

// typedefs
//

/**
 * @typedef {Object} DriveType
 * @prop {string} id
 * @prop {string} title
 * @prop {string} origin
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
  getDriveHandlers,
  getDefaultDriveHandler,
  setDefaultDriveHandler
}

/**
 * @returns {Promise<DriveType[]>}
 */
export async function listDriveTypes () {
  var {driveTypes, defaultDriveHandlers} = await load()
  var types = []

  const getDefaultDriveHandler = typeId => defaultDriveHandlers[typeId] || 'beaker://explorer/'

  // installed type packages
  for (let t of driveTypes) {
    if (!t || typeof t !== 'object') continue
    if (!t.id || typeof t.id !== 'string') continue
    if (!t.title || typeof t.title !== 'string') continue
    if (types.find(t2 => t.id === t2.id)) continue // avoid duplicates

    types.push({
      origin: undefined,
      id: t.id,
      title: t.title,
      defaultHandler: getDefaultDriveHandler(t.id),
      handlers: await getDriveHandlers(t.id)
    })
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
        origin: program.url,
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
 * @param {string} typeId
 * @returns {Promise<DriveHandler[]>}
 */
export async function getDriveHandlers (typeId) {
  var programs = typeId ? await programRegistry.listPrograms({handlesDriveType: typeId}) : []
  if (typeId === 'website') programs.unshift({url: 'website', manifest: {title: 'Website'}})
  if (typeId === 'application') programs.unshift({url: 'website', manifest: {title: 'Application'}})
  return programs.map(program => ({
    url: program.url,
    title: _get(program, 'manifest.title', '')
  })).concat([{url: 'beaker://explorer/', title: 'Files Explorer'}])
}

/**
 * @param {string} typeId
 * @returns {Promise<string>}
 */
export async function getDefaultDriveHandler (typeId) {
  var {defaultDriveHandlers} = await load()
  if ( defaultDriveHandlers[typeId]) return defaultDriveHandlers[typeId]
  if (typeId === 'application' || typeId === 'website') return 'website'
  return 'beaker://explorer/'
}

/**
 * @param {string} typeId
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function setDefaultDriveHandler (typeId, url) {
  var release = await lock('update:type-registry')
  try {
    var {driveTypes, defaultDriveHandlers} = await load()
    logger.info('Setting drive handler', {type: typeId, handler: url})
    defaultDriveHandlers[typeId] = normalizeUrl(url)
    await persist({driveTypes, defaultDriveHandlers})
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
    var {driveTypes, defaultDriveHandlers} = await load()
    logger.info('Unsetting drive handler', {type: typeId})
    delete defaultDriveHandlers[typeId]
    await persist({driveTypes, defaultDriveHandlers})
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
  var driveTypes = []
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
        driveTypes = (Array.isArray(typeRegistryObj.driveTypes) ? typeRegistryObj.driveTypes : []).filter(type => (
          !!type
          && typeof type === 'object'
          && typeof type.id === 'string'
        ))
        defaultDriveHandlers = typeRegistryObj.defaultDriveHandlers && typeof typeRegistryObj.defaultDriveHandlers === 'object' ? typeRegistryObj.defaultDriveHandlers : {}
      } catch (e) {
        logger.error(`Invalid ${PATHS.TYPE_REGISTRY_JSON} file`, {error: e})
        logger.error(`A new ${PATHS.TYPE_REGISTRY_JSON} will be created and the previous file will be saved as ${PATHS.TYPE_REGISTRY_JSON}.backup`)
        await filesystem.get().pda.rename(PATHS.TYPE_REGISTRY_JSON, filesystem.get().session.drive, PATHS.TYPE_REGISTRY_JSON + '.backup')
      }
    }
  } finally {
    release()
  }
  return {driveTypes, defaultDriveHandlers}
}

/**
 * @returns {Promise<void>}
 */
async function persist ({driveTypes, defaultDriveHandlers}) {
  var release = await lock('access:type-registry')
  try {
    await filesystem.get().pda.writeFile(PATHS.TYPE_REGISTRY_JSON, JSON.stringify({
      type: 'type-registry',
      driveTypes,
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
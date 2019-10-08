import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'program-registry'})
import dat from '../dat/index'
import * as filesystem from './index'
import { PATHS } from '../../lib/const'
import _cloneDeep from 'lodash.clonedeep'
import lock from '../../lib/lock'

// typedefs
//

/**
 * @typedef {Object} InstalledProgram
 * @prop {string} url
 * @prop {string} key
 * @prop {string} version
 * @prop {object} manifest
 */

// globals
// =

var installedPrograms = undefined

// exported api
// =

export const WEBAPI = {
  listPrograms,
  getProgram,
  installProgram,
  uninstallProgram
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.type]
 * @returns {Promise<InstalledProgram[]>}
 */
export async function listPrograms (opts = {}) {
  await ensureLoaded()
  var programs = _cloneDeep(installedPrograms)
  if (opts.type) {
    programs = programs.filter(p => p.manifest.type === opts.type)
  }
  return programs
}

/**
 * @param {string} url 
 * @returns {Promise<InstalledProgram>}
 */
export async function getProgram (url) {
  await ensureLoaded()
  url = normalizeUrl(url)
  return _cloneDeep(installedPrograms.find(p => normalizeUrl(p.url) === url))
}

/**
 * @param {string} url 
 * @param {number|string} version 
 * @returns {Promise<void>}
 */
export async function installProgram (url, version) {
  await ensureLoaded()
  url = normalizeUrl(url)
  var key = dat.archives.fromURLToKey(url)
  logger.info('Installing program', {url, key, version})

  var archive = await dat.archives.getOrLoadArchive(key)
  var checkout = version ? await dat.archives.getArchiveCheckout(archive, version) : archive
  if (!version) version = (await archive.getInfo()).version
  var manifest = await checkout.pda.readFile('dat.json', 'utf8')
  manifest = JSON.parse(manifest)

  if (await getProgram(url)) {
    installedPrograms = installedPrograms.filter(p => normalizeUrl(p.url) !== url)
  }
  installedPrograms.push({
    url,
    key,
    version,
    manifest
  })
  await persist()

  logger.verbose('Successfully installed program', {url, key, version})
}

/**
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function uninstallProgram (url) {
  await ensureLoaded()
  url = normalizeUrl(url)
  logger.info('Uninstalling program', {url})

  installedPrograms = installedPrograms.filter(p => normalizeUrl(p.url) !== url)
  await persist()

  logger.verbose('Successfully uninstalled program', {url})
}

// internal methods
// =

/**
 * @returns {Promise<void>}
 */
async function ensureLoaded () {
  if (installedPrograms) return
  var release = await lock('access:program-registry')
  try {
    var programRegistryStr
    try {
      programRegistryStr = await filesystem.get().pda.readFile(PATHS.PROGRAM_REGISTRY_JSON)
    } catch (e) {
      // dne
    }

    // parse & validate
    if (programRegistryStr) {
      try {
        let programRegistryObj = JSON.parse(programRegistryStr)
        installedPrograms = (Array.isArray(programRegistryObj.installed) ? programRegistryObj.installed : []).filter(program => (
          !!program
          && typeof program === 'object'
          && typeof program.url === 'string'
        ))
      } catch (e) {
        logger.error(`Invalid ${PATHS.PROGRAM_REGISTRY_JSON} file`, {error: e})
        logger.error(`A new ${PATHS.PROGRAM_REGISTRY_JSON} will be created and the previous file will be saved as ${PATHS.PROGRAM_REGISTRY_JSON}.backup`)
        await filesystem.get().pda.rename(PATHS.PROGRAM_REGISTRY_JSON, PATHS.PROGRAM_REGISTRY_JSON + '.backup')
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
  var release = await lock('access:program-registry')
  try {
    await filesystem.get().pda.writeFile(PATHS.PROGRAM_REGISTRY_JSON, JSON.stringify({
      type: 'program-registry',
      installed: installedPrograms
    }, null, 2))
  } catch (e) {
    logger.error('Failed to persist program registry', {error: e})
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
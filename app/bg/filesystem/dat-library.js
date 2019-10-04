import * as logLib from '../logger'
const logger = logLib.child({category: 'filesystem', subcategory: 'dat-library'})
import * as filesystem from './index'
import * as trash from './trash'
import * as users from './users'
import * as archivesDb from '../dbs/archives'
import * as datArchives from '../dat/archives'
import lock from '../../lib/lock'
import { join as joinPath } from 'path'
import slugify from 'slugify'
import libTools from '@beaker/library-tools'
import * as uwg from '../uwg/index'
import { PATHS, DAT_HASH_REGEX } from '../../lib/const'

// typedefs
// =

/**
 * @typedef {import('../dat/daemon').DaemonDatArchive} DaemonDatArchive
 * @typedef {import('./users').User} User
 * @typedef {import('../dbs/archives').LibraryArchiveMeta} LibraryArchiveMeta
 *
 * @typedef {Object} LibraryDat
 * @prop {string} key
 * @prop {boolean} isSaved
 * @prop {boolean} isHosting
 * @prop {string} visibility
 * @prop {Date} savedAt
 * @prop {LibraryArchiveMeta} meta
 * @prop {LibraryArchiveMeta} author
 */

// globals
// =

var libraryDats = /** @type LibraryDat[] */([])

// exported api
// =

/**
 * @returns {Promise<void>}
 */
export async function setup () {
  // read library.json
  var libraryJsonStr
  try {
    libraryJsonStr = await filesystem.get().pda.readFile(PATHS.LIBRARY_JSON)
  } catch (e) {
    // dne
  }

  // parse & validate
  var dats = []
  if (libraryJsonStr) {
    try {
      let libraryJsonObj = JSON.parse(libraryJsonStr)
      dats = (libraryJsonObj.dats || []).filter(dat => typeof dat.key === 'string' && DAT_HASH_REGEX.test(dat.key))
    } catch (e) {
      logger.error(`Invalid ${PATHS.LIBRARY_JSON} file`, {error: e})
      logger.error(`A new ${PATHS.LIBRARY_JSON} will be created and the previous file will be saved as ${PATHS.LIBRARY_JSON}.backup`)
      await filesystem.get().pda.rename(PATHS.LIBRARY_JSON, PATHS.LIBRARY_JSON + '.backup')
    }
  }

  // massage and fetch additional info
  for (let dat of dats) {
    dat.isSaved = true
    dat.savedAt = new Date(dat.savedAt)
    dat.meta = await archivesDb.getMeta(dat.key)
  }
  libraryDats = dats

  // watch for updates to library dats
  datArchives.on('updated', async ({key, details, oldMeta}) => {
    var dat = libraryDats.find(dat => dat.key === key)
    if (!dat) return

    var release = await lock(`configure-archive:${key}`)
    try {
      // update the record
      dat.meta = await archivesDb.getMeta(key)

      // handle state changes
      var oldCat = libTools.typeToCategory(oldMeta.type, true) || 'other'
      var newCat = libTools.typeToCategory(details.type, true) || 'other'
      var changes = {
        type: details.type !== oldMeta.type,
        title: details.title !== oldMeta.title,
        description: details.description !== oldMeta.description,
        author: details.author !== oldMeta.author
      }
      if (changes.type || changes.title) {
        let archive = await datArchives.getOrLoadArchive(key)
        await ensureUnmounted(filesystem.get(), PATHS.LIBRARY_SAVED_DAT(oldCat), archive)
        await ensureMounted(filesystem.get(), PATHS.LIBRARY_SAVED_DAT(newCat), archive, details.title)
      }
      if (dat.visibility === 'public') {
        if (changes.author) {
          let oldUser = oldMeta.author ? await users.get(oldMeta.author) : null
          let newUser = details.author ? await users.get(details.author) : null
          if (oldUser) {
            await uwg.dats.unpublish(oldUser.archive, key)
          }
          if (newUser) {
            await uwg.dats.publish(newUser.archive, key, {
              title: details.title,
              description: details.description,
              type: details.type
            })
          }
        } else if (changes.title || changes.description || changes.type) {
          let user = details.author ? await users.get(details.author) : null
          if (user) {
            await uwg.dats.publish(user.archive, key, {
              title: details.title,
              description: details.description,
              type: details.type
            })
          }
        }
      }
    } catch (e) {
      logger.error('Failed to update archive in filesystem after change', {error: e.toString(), key, details, oldMeta})
    } finally {
      release()
    }
  })
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.type]
 * @param {string} [opts.author]
 * @param {string} [opts.key]
 * @param {string} [opts.visibility]
 * @param {string} [opts.forkOf]
 * @param {boolean} [opts.isSaved]
 * @param {boolean} [opts.isHosting]
 * @param {boolean} [opts.isOwner]
 * @param {string} [opts.sortBy]
 * @param {number} [opts.offset=0]
 * @param {number} [opts.limit]
 * @param {boolean} [opts.reverse]
 * @returns {Promise<LibraryDat[]>}
 */
export async function list (opts = {}) {
  opts = (opts && typeof opts === 'object') ? opts : {}

  // run initial query on public or private indexes
  var results
  if (opts.visibility === 'public' && !opts.isSaved && !opts.isHosting && !opts.isOwner) {
    results = await uwg.dats.list(opts)
  } else {
    results = localQuery(opts)
  }

  // run second-pass on results
  // (this pass uses data which does not exist on the public index)
  var results2 = []
  for (let result of results) {
    let libraryDat = libraryDats.find(d => d.key === result.key)
    if (typeof opts.forkOf !== 'undefined' && result.meta.forkOf !== opts.forkOf) continue
    if (typeof opts.isHosting !== 'undefined' && libraryDat.isHosting !== opts.isHosting) continue
    if (typeof opts.isOwner !== 'undefined' && result.meta.isOwner !== opts.isOwner) continue
    if (typeof opts.isSaved !== 'undefined' && Boolean(libraryDat) !== opts.isSaved) continue
    results2.push(/** @type LibraryDat */({
      key: result.key,
      author: ('author' in result) ? result.author : (result.meta.author ? await archivesDb.getMeta(result.meta.author) : undefined),
      meta: Object.assign({}, result.meta),
      isSaved: !!libraryDat,
      isHosting: libraryDat ? libraryDat.isHosting : false,
      visibility: libraryDat ? libraryDat.visibility : 'public',
      savedAt: libraryDat ? new Date(libraryDat.savedAt) : undefined
    }))
  }

  if (opts.sortBy === 'mtime') {
    results2.sort((a, b) => a.meta.mtime - b.meta.mtime)
  } else if (opts.sortBy === 'title') {
    results2.sort((a, b) => a.meta.title.localeCompare(b.meta.title))
  }
  if (opts.reverse) results2.reverse()

  if (opts.offset || opts.limit) {
    results2 = results2.slice(opts.offset, opts.limit)
  }

  return results2
}

/**
 * @returns {Promise<LibraryDat[]>}
 */
export async function listTrash () {
  var items = await trash.query({mounts: true})
  return Promise.all(items.map(async (item) => {
    var meta = await archivesDb.getMeta(item.stat.mount.key)
    return {
      key: item.stat.mount.key,
      author: await archivesDb.getMeta(meta.author),
      meta,
      isSaved: false,
      isHosting: false,
      visibility: undefined,
      savedAt: item.stat.mtime
    }
  }))
}

/**
 * @param {string} key
 * @returns {LibraryDat?}
 */
export function getConfig (key) {
  var dat = libraryDats.find(dat => dat.key === key)
  if (dat) {
    return /** @type LibraryDat */({
      key,
      meta: Object.assign({}, dat.meta),
      isSaved: dat.isSaved,
      isHosting: dat.isHosting,
      visibility: dat.visibility,
      savedAt: new Date(dat.savedAt)
    })
  }
  return null
}

/**
 * @param {DaemonDatArchive} archive
 * @param {Object} settings
 * @param {boolean} [settings.isSaved]
 * @param {boolean} [settings.isHosting]
 * @param {string} [settings.visibility]
 * @returns {Promise<void>}
 */
export async function configureArchive (archive, settings) {
  var key = archive.key.toString('hex')
  var release = await lock(`configure-archive:${key}`)
  try {
    // fetch existing record (if it exists)
    var record = libraryDats.find(r => r.key === key)
    if (!('isSaved' in settings)) {
      settings.isSaved = !!record
    }

    // grab old values
    var oldSettings = {
      isSaved: !!record,
      isHosting: record ? record.isHosting : false,
      visibility: record ? record.visibility : 'unlisted'
    }

    if (settings.isSaved && !record) {
      // add
      let meta = await archivesDb.getMeta(key)
      record = {key, meta, isSaved: true, isHosting: false, visibility: 'unlisted', savedAt: new Date()}
      libraryDats.push(record)
    } else if (!settings.isSaved && record) {
      // remove
      libraryDats = libraryDats.filter(r => r !== record)
      settings.isHosting = false
      settings.visibility = 'unlisted'
    }

    // update
    if ('isHosting' in settings) record.isHosting = settings.isHosting
    if ('visibility' in settings) record.visibility = settings.visibility

    // persist
    await saveLibraryJson()

    // handle state changes
    var manifest = await archive.pda.readManifest().catch(e => {})
    if ('visibility' in settings && oldSettings.visibility !== settings.visibility) {
      await updateVisibility(archive, manifest, settings.visibility)
    }
    if ('isHosting' in settings && oldSettings.isHosting !== settings.isHosting) {
      await updateHosting(archive, manifest, settings.isHosting)
    }
    if (settings.isSaved !== oldSettings.isSaved) {
      await updateSaved(archive, manifest, settings.isSaved)
    }
  } finally {
    release()
  }
}

// internal methods
// =

/**
 * @returns {Promise<void>}
 */
async function saveLibraryJson () {
  await filesystem.get().pda.writeFile(PATHS.LIBRARY_JSON, JSON.stringify({
    type: 'beakerbrowser.com/library',
    dats: libraryDats.map(dat => ({
      key: dat.key,
      isHosting: dat.isHosting,
      visibility: dat.visibility,
      savedAt: dat.savedAt.toISOString()
    }))
  }, null, 2))
}

/**
 * @param {Object} opts
 * @param {string} [opts.type]
 * @param {string} [opts.author]
 * @param {string} [opts.key]
 * @param {string} [opts.visibility]
 * @returns {LibraryDat[]}
 */
function localQuery (opts) {
  var results = []
  for (let dat of libraryDats) {
    if (typeof opts.type !== 'undefined') {
      let type = Array.isArray(opts.type) ? opts.type : [opts.type]
      if (!type.includes(dat.meta.type)) {
        continue
      }
    }
    if (typeof opts.author !== 'undefined') {
      let author = Array.isArray(opts.author) ? opts.author : [opts.author]
      if (!author.includes(dat.meta.author)) {
        continue
      }
    }
    if (typeof opts.key !== 'undefined') {
      let key = Array.isArray(opts.key) ? opts.key : [opts.key]
      if (!key.includes(dat.meta.key)) {
        continue
      }
    }
    if (typeof opts.visibility !== 'undefined') {
      if (dat.visibility !== opts.visibility) continue
    }
    results.push(dat)
  }
  return results
}

/**
 * @param {DaemonDatArchive} archive
 * @param {Object} manifest
 * @param {boolean} isSaved
 * @returns {Promise<void>}
 */
async function updateSaved (archive, manifest, isSaved) {
  var category = libTools.typeToCategory(manifest.type, true)
  var containingPath = PATHS.LIBRARY_SAVED_DAT(category)
  if (isSaved) {
    await ensureMounted(filesystem.get(), containingPath, archive, manifest.title)
    await ensureUnmounted(filesystem.get(), PATHS.TRASH, archive)
  } else {
    await ensureMounted(filesystem.get(), PATHS.TRASH, archive, manifest.title)
    await ensureUnmounted(filesystem.get(), containingPath, archive)
  }
}

/**
 * @param {DaemonDatArchive} archive
 * @param {Object} manifest
 * @param {Boolean} isHosting
 * @returns {Promise<void>}
 */
async function updateHosting (archive, manifest, isHosting) {
  // TODO
}

/**
 * @param {DaemonDatArchive} archive
 * @param {Object} manifest
 * @param {string} visibility
 * @returns {Promise<void>}
 */
async function updateVisibility (archive, manifest, visibility) {
  var user = await users.get(manifest.author)
  if (!user) {
    logger.error(`Failed to ${visibility === 'public' ? 'publish' : 'unpublish'} archive, author-user not found`, {
      key: archive.key.toString('hex'),
      author: manifest.author
    })
    return
  }
  if (visibility === 'public') {
    await uwg.dats.publish(user.archive, archive.key.toString('hex'), {
      title: manifest.title,
      description: manifest.description,
      type: manifest.type
    })
  } else {
    await uwg.dats.unpublish(user.archive, archive.key.toString('hex'))
  }
}

/**
 * @param {DaemonDatArchive} containingArchive
 * @param {string} containingPath
 * @param {DaemonDatArchive} archive
 * @returns {Promise<string?>}
 */
async function findMount (containingArchive, containingPath, archive) {
  var names = await containingArchive.pda.readdir(containingPath)
  for (let name of names) {
    try {
      let st = await containingArchive.pda.stat(joinPath(containingPath, name))
      if (st.mount && Buffer.compare(st.mount.key, archive.key) === 0) {
        return name
      }
    } catch (e) {
      logger.error('Stat() failed during findMount()', {name, error: e})
      // ignore, it's possible the file was removed after readdir()
    }
  }
  return undefined
}

/**
 * @param {DaemonDatArchive} containingArchive
 * @param {string} containingPath
 * @param {string} title
 * @returns {Promise<string>}
 */
async function getAvailableMountName (containingArchive, containingPath, title) {
  var basename = slugify((title || '').trim() || 'untitled').toLowerCase()
  for (let i = 1; i < 1e9; i++) {
    let name = (i === 1) ? basename : `${basename}-${i}`
    try {
      await containingArchive.pda.stat(joinPath(containingPath, name))
      // file already exists, skip
    } catch (e) {
      // dne, this works
      return name
    }
  }
  // yikes if this happens
  throw new Error('Unable to find an available name for ' + title)
}

/**
 * @param {DaemonDatArchive} containingArchive
 * @param {string} containingPath
 * @param {DaemonDatArchive} archive
 * @param {string} title
 * @returns {Promise<void>}
 */
async function ensureMounted (containingArchive, containingPath, archive, title) {
  try {
    if (!(await findMount(containingArchive, containingPath, archive))) {
      var mountName = await getAvailableMountName(containingArchive, containingPath, title)
      await containingArchive.pda.mount(joinPath(containingPath, mountName), archive.key)
    }
  } catch (e) {
    logger.error('Failed to mount archive', {key: archive.key.toString('hex'), error: e})
  }
}

/**
 * @param {DaemonDatArchive} containingArchive
 * @param {string} containingPath
 * @param {DaemonDatArchive} archive
 * @returns {Promise<void>}
 */
async function ensureUnmounted (containingArchive, containingPath, archive) {
  try {
    var mountName = await findMount(containingArchive, containingPath, archive)
    if (mountName) {
      await containingArchive.pda.unmount(joinPath(containingPath, mountName))
    }
  } catch (e) {
    logger.error('Failed to unmount archive', {key: archive.key.toString('hex'), error: e})
  }
}
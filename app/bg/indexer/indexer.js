import * as filesystem from '../filesystem/index'
import * as logLib from '../logger'
const logger = logLib.get().child({category: 'indexer', subcategory: 'sub-indexes'})
import { parseUrl } from './const'

/**
 * @typedef {import('./const').SubscribedSite} SubscribedSite
 * @typedef {import('./const').ResourceUpdate} ResourceUpdate
 * @typedef {import('./const').IndexerDefinition} IndexerDefinition
 */

export class Indexer {
  /**
   * @param {IndexerDefinition} opts 
   */
  constructor (opts) {
    this.id = opts.id
    this.title = opts.title
    this.filter = opts.filter
    this.getData = opts.getData
    this.notifications = opts.notifications
  }

  /**
   * @param {Object} db 
   * @param {SubscribedSite} site 
   * @param {ResourceUpdate} update 
   * @param {String[]} myOrigins
   * @returns {Promise<Boolean>} - was the update indexed?
   */
  async index (db, site, update, myOrigins) {
    if (this.filter(update)) {
      logger.silly(`Indexing ${site.origin}${update.path} into ${this.id}`, {site: site.origin, path: update.path})
      await this.put(db, site, update, myOrigins)
      return true
    }
    return false
  }

  /**
   * @param {Object} db 
   * @param {SubscribedSite} site 
   * @param {ResourceUpdate} update 
   * @param {String[]} myOrigins
   * @returns {Promise<void>}
   */
  async put (db, site, update, myOrigins) {
    // extract data pairs ([key, value]) from the resource
    var dataEntries = await this.getData(site, update)

    // index the base record
    var rowid
    var isNew = true
    try {
      let res = await db('resources').insert({
        site_rowid: site.rowid,
        path: update.path,
        index: this.id,
        mtime: update.mtime,
        ctime: update.ctime
      })
      rowid = res[0]
    } catch (e) {
      // TODO can we check the error type for constraint violation?
      isNew = false
      let res = await db('resources').select('rowid').where({
        site_rowid: site.rowid,
        path: update.path
      })
      rowid = res[0].rowid
      await db('resources').update({
        index: this.id,
        mtime: update.mtime,
        ctime: update.ctime
      }).where({rowid})
    }

    // index the resource's data
    if (!isNew) {
      await db('resources_data').del().where({resource_rowid: rowid})
    }
    await Promise.all(dataEntries.map(([key, value]) => (
      db('resources_data').insert({resource_rowid: rowid, key, value})
    )))

    // index notifications
    if (this.notifications) {
      for (let [notificationKey, notificationType] of this.notifications) {
        for (let [key, value] of dataEntries) {
          if (key !== notificationKey) continue
          let subjectp = parseUrl(value, site.origin)
          if (!myOrigins.includes(site.origin) && myOrigins.includes(subjectp.origin)) {
            if (subjectp.origin === 'hyper://private') {
              // special case- if somebody publishes something linking to hyper://private,
              // it's a mistake which should be ingored
              // -prf
              continue
            }
            await db('notifications').insert({
              site_rowid: site.rowid,
              resource_rowid: rowid,
              type: notificationType,
              subject_origin: subjectp.origin,
              subject_path: subjectp.path,
              is_read: 0,
              ctime: update.ctime
            }).onConflictDoNothing()
          }
        }
      }
    }
  }
}
import EventEmitter from 'events'
import * as db from './profile-data-db'
import knex from '../lib/knex'
import lock from '../../lib/lock'

// typedefs
// =

/**
 * @typedef {Object} DatDnsRecord
 * @prop {string} name
 * @prop {string} key
 * @prop {boolean} isCurrent
 * @prop {number} lastConfirmedAt
 * @prop {number} firstConfirmedAt
 */

// globals
// =

const events = new EventEmitter()

// exported api
// =

export const on = events.on.bind(events)

export const once = events.once.bind(events)
export const removeListener = events.removeListener.bind(events)

/**
 * @param {string} name
 * @returns {Promise<DatDnsRecord>}
 */
export const getCurrentByName = async function (name) {
  return massageDNSRecord(await db.get(knex('dat_dns').where({name, isCurrent: 1})))
}

/**
 * @param {string} key
 * @returns {Promise<DatDnsRecord>}
 */
export const getCurrentByKey = async function (key) {
  return massageDNSRecord(await db.get(knex('dat_dns').where({key, isCurrent: 1})))
}

/**
 * @param {Object} opts
 * @param {string} opts.key
 * @param {string} opts.name
 * @returns {Promise<void>}
 */
export const update = async function ({key, name}) {
  var release = await lock('dat-dns-update:' + name)
  try {
    var old = await db.get(knex('dat_dns').where({name, isCurrent: 1}))
    if (old && old.key !== key) {
      // unset old
      await db.run(knex('dat_dns').update({isCurrent: 0}).where({name}))
      events.emit('updated', {key: old.key, name: undefined})
    }

    let curr = await db.get(knex('dat_dns').where({name, key}))
    if (!curr) {
      // insert new
      await db.run(knex('dat_dns').insert({
        name,
        key,
        isCurrent: 1,
        lastConfirmedAt: Date.now(),
        firstConfirmedAt: Date.now()
      }))
    } else {
      // update current
      await db.run(knex('dat_dns').update({lastConfirmedAt: Date.now(), isCurrent: 1}).where({name, key}))
    }
    events.emit('updated', {key, name})
  } finally {
    release()
  }
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export const unset = async function (key) {
  var curr = await db.get(knex('dat_dns').where({key, isCurrent: 1}))
  if (curr) {
    await db.run(knex('dat_dns').update({isCurrent: 0}).where({key}))
    events.emit('updated', {key, name: undefined})
  }
}

// internal methods
// =

function massageDNSRecord (record) {
  if (!record) return null
  return {
    name: record.name,
    key: record.key,
    isCurrent: Boolean(record.isCurrent),
    lastConfirmedAt: record.lastConfirmedAt,
    firstConfirmedAt: record.firstConfirmedAt
  }
}
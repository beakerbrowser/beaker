import * as beakerCore from '@beaker/core'
import { app } from 'electron'
import path from 'path'
import crypto from 'crypto'
import https from 'https'
import querystring from 'querystring'
import ms from 'ms'
import jetpack from 'fs-jetpack'
import concat from 'concat-stream'
import osName from 'os-name'
const settingsDb = beakerCore.dbs.settings
import {ANALYTICS_DATA_FILE, ANALYTICS_SERVER, ANALYTICS_CHECKIN_INTERVAL, DAT_SWARM_PORT} from '@beaker/core/lib/const'
const debug = beakerCore.debugLogger('beaker-analytics')

// exported methods
// =

export function setup () {
  setTimeout(checkin, ms('3s'))
}

// internal methods
// =

async function checkin () {
  // enabled?
  var isEnabled = await settingsDb.get('analytics_enabled')
  if (isEnabled == 1) {
    try {
      var pingData = await readPingData()
      if ((Date.now() - (pingData.lastPingTime || 0)) > ANALYTICS_CHECKIN_INTERVAL) {
        await sendPing(pingData)
      }
      pingData.lastPingTime = Date.now()
      await writePingData(pingData)
    } catch (e) {
      // failed, we'll reschedule another ping in 10 hours
    }
  }

  // schedule another ping check in 10 hours
  var to = setTimeout(checkin, ms('10h'))
  to.unref()
}

function sendPing (pingData) {
  return new Promise(async (resolve, reject) => {
    var qs = querystring.stringify({
      userId: pingData.id,
      beakerVersion: app.getVersion(),
      os: osName(),
      netReachablePort: await portCheck(),
      datWatchlist: (await beakerCore.dbs.watchlist.getSites(0)).length,
      datArchivesOwned: (await beakerCore.dbs.archives.query(0, {isSaved: true, isOwner: true})).length,
      datArchivesSeed: (await beakerCore.dbs.archives.query(0, {isSaved: true, isOwner: false})).length,
      datArchivesCache: (await beakerCore.dbs.archives.query(0, {isSaved: false, isOwner: false})).length
    })

    debug('Sending ping to %s: %s', ANALYTICS_SERVER, qs)

    var req = https.request({
      method: 'POST',
      hostname: ANALYTICS_SERVER,
      path: '/ping?' + qs
    }, (res) => {
      if (res.statusCode === 204) {
        debug('Ping succeeded')
        resolve()
      } else {
        res.setEncoding('utf8')
        res.pipe(concat(body => debug('Ping failed', res.statusCode, body)))
        reject()
      }
    })
    req.on('error', err => {
      debug('Ping failed', err)
      reject()
    })
    req.end()
  })
}

async function readPingData () {
  var data = await jetpack.readAsync(path.join(app.getPath('userData'), ANALYTICS_DATA_FILE), 'json')
  return data || {lastPingTime: 0, id: crypto.randomBytes(32).toString('hex')}
}

async function writePingData (data) {
  return jetpack.writeAsync(path.join(app.getPath('userData'), ANALYTICS_DATA_FILE), data)
}

async function portCheck () {
  return new Promise((resolve, reject) => {
    // TODO: move this to ANALYTICS_SERVER
    https.get('https://portcheck.transmissionbt.com/' + DAT_SWARM_PORT, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        if (body === '1') {
          resolve('1')
        }
        resolve('0')
      })
    })
  })
}

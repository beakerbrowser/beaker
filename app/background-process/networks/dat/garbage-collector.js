import * as archivesDb from '../../dbs/archives'
import {
  DAT_GC_FIRST_COLLECT_WAIT,
  DAT_GC_REGULAR_COLLECT_WAIT
} from '../../../lib/const'
const debug = require('debug')('dat')

// exported API
// =

export function setup () {
  schedule(DAT_GC_FIRST_COLLECT_WAIT)
}

export async function collect ({olderThan, biggerThan} = {}) {
  var startTime = Date.now()
  var expiredArchives = await archivesDb.listExpiredArchives({olderThan, biggerThan})
  debug('GC cleaning out %d expired archives', expiredArchives.length)
  for (let i = 0; i < expiredArchives.length; i++) {
    await archivesDb.deleteArchive(expiredArchives[i].key)
  }
  debug('GC completed in %d ms', Date.now() - startTime)
  schedule(DAT_GC_REGULAR_COLLECT_WAIT)
}

// helpers
// =

function schedule (time) {
  var t = setTimeout(collect, time)
  t.unref()
}

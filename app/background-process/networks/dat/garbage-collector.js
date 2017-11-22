import * as archivesDb from '../../dbs/archives'
import {
  DAT_GC_FIRST_COLLECT_WAIT,
  DAT_GC_REGULAR_COLLECT_WAIT
} from '../../../lib/const'
const debug = require('debug')('dat')

// globals
// =

var nextGCTimeout

// exported API
// =

export function setup () {
  schedule(DAT_GC_FIRST_COLLECT_WAIT)
}

export async function collect ({olderThan, biggerThan} = {}) {
  // clear any scheduled GC
  if (nextGCTimeout) {
    clearTimeout(nextGCTimeout)
    nextGCTimeout = null
  }

  // run the GC
  var totalBytes = 0
  var startTime = Date.now()
  var expiredArchives = await archivesDb.listExpiredArchives({olderThan, biggerThan})
  debug('GC cleaning out %d expired archives', expiredArchives.length)
  for (let i = 0; i < expiredArchives.length; i++) {
    totalBytes += expiredArchives[i].metaSize
    totalBytes += expiredArchives[i].stagingSize
    await archivesDb.deleteArchive(expiredArchives[i].key)
  }
  debug('GC completed in %d ms', Date.now() - startTime)

  // schedule the next GC
  schedule(DAT_GC_REGULAR_COLLECT_WAIT)

  // return stats
  return {totalBytes, totalArchives: expiredArchives.length}
}

// helpers
// =

function schedule (time) {
  nextGCTimeout = setTimeout(collect, time)
  nextGCTimeout.unref()
}

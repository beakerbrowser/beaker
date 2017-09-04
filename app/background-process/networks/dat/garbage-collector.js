import * as archivesDb from '../../dbs/archives'
import {
  DAT_GC_FIRST_COLLECT_WAIT,
  DAT_GC_REGULAR_COLLECT_WAIT
} from '../../../lib/const'
const debug = require('debug')('datgc')

// exported API
// =

export function setup () {
  schedule(DAT_GC_FIRST_COLLECT_WAIT)
}

export async function collect ({olderThan, biggerThan} = {}) {
  var startTime = Date.now()

  // first unsave expired archives
  var expiredArchives = await archivesDb.listExpiredArchives()
  debug('GC unsaving %d expired archives', expiredArchives.length)
  for (let i = 0; i < expiredArchives.length; i++) {
    await archivesDb.setUserSettings(0, expiredArchives[i].key, {isSaved: false})
  }

  // now GC old archives
  var unusedArchives = await archivesDb.listGarbageCollectableArchives({olderThan, biggerThan})
  debug('GC cleaning out %d unused archives', unusedArchives.length)
  for (let i = 0; i < unusedArchives.length; i++) {
    await archivesDb.deleteArchive(unusedArchives[i].key)
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

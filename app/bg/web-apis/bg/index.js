import * as indexer from '../../indexer/index'

// exported api
// =

export default {
  clearAllData () {
    return indexer.clearAllData()
  },

  getSite (url) {
    return indexer.getSite(url)
  },

  listSites (opts) {
    return indexer.listSites(opts)
  },
  
  getRecord (url) {
    return indexer.getRecord(url)
  },
  
  listRecords (opts) {
    return indexer.listRecords(opts)
  },
  
  countRecords (opts) {
    return indexer.countRecords(opts)
  },
  
  searchRecords (q, opts) {
    return indexer.searchRecords(q, opts)
  },

  clearNotifications () {
    return indexer.clearNotifications()
  },

  getState () {
    return indexer.getState()
  },

  createEventStream () {
    return indexer.createEventStream()
  }
}

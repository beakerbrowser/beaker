import * as indexer from '../../indexer/index'

// exported api
// =

export default {
  clearAllData () {
    return indexer.clearAllData()
  },
  
  getRecord (url) {
    return indexer.getRecord(url)
  },
  
  listRecords (opts) {
    return indexer.listRecords(opts)
  },
  
  searchRecords (q, opts) {
    return indexer.searchRecords(q, opts)
  },
  
  listNotifications (opts) {
    return indexer.listNotifications(opts)
  },
  
  countNotifications (opts) {
    return indexer.countNotifications(opts)
  },

  setNotificationIsRead (rowid, isRead) {
    return indexer.setNotificationIsRead(rowid, isRead)
  }
}

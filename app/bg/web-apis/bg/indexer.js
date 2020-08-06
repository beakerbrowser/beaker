import * as indexer from '../../indexer/index'

// exported api
// =

export default {
  clearAllData () {
    return indexer.clearAllData()
  },
  
  get (url) {
    return indexer.get(url)
  },
  
  list (opts) {
    return indexer.list(opts)
  },
  
  search (q, opts) {
    return indexer.search(q, opts)
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

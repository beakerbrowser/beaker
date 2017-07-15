import * as bookmarksDb from '../dbs/bookmarks'

// exported api
// =

export default {
  async add (...args) {
    return bookmarksDb.add(0, ...args)
  },

  async changeTitle (...args) {
    return bookmarksDb.changeTitle(0, ...args)
  },

  async changeUrl (...args) {
    return bookmarksDb.changeUrl(0, ...args)
  },

  async remove (...args) {
    return bookmarksDb.remove(0, ...args)
  },

  async get (...args) {
    return bookmarksDb.get(0, ...args)
  },

  async list (...args) {
    return bookmarksDb.list(0, ...args)
  },

  async togglePinned (...args) {
    return bookmarksDb.togglePinned(0, ...args)
  }
}

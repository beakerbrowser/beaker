import {parse as parseURL} from 'url'
import * as bookmarksDb from '../dbs/bookmarks'
import {PermissionsError} from 'beaker-error-constants'

// exported api
// =

export default {
  async add (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.add(0, ...args)
  },

  async changeTitle (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.changeTitle(0, ...args)
  },

  async changeUrl (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.changeUrl(0, ...args)
  },

  async remove (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.remove(0, ...args)
  },

  async get (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.get(0, ...args)
  },

  async list (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.list(0, ...args)
  },

  async togglePinned (...args) {
    assertTmpBeakerOnly(this.sender)
    return bookmarksDb.togglePinned(0, ...args)
  }
}

// temporary helper to make sure the call is made by a beaker: page
function assertTmpBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError()
  }
}

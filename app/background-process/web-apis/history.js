import {parse as parseURL} from 'url'
import * as historyDb from '../dbs/history'
import {PermissionsError} from 'beaker-error-constants'

// exported api
// =

export default {
  async addVisit (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.addVisit(0, ...args)
  },

  async getVisitHistory (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.getVisitHistory(0, ...args)
  },

  async getMostVisited (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.getMostVisited(0, ...args)
  },

  async search (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.search(...args)
  },

  async removeVisit (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.removeVisit(...args)
  },

  async removeAllVisits (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.removeAllVisits(...args)
  },

  async removeVisitsAfter (...args) {
    assertTmpBeakerOnly(this.sender)
    return historyDb.removeVisitsAfter(...args)
  }
}

// temporary helper to make sure the call is made by a beaker: page
function assertTmpBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError()
  }
}

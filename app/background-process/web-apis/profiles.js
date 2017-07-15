import * as profilesDb from '../dbs/profiles'

// exported api
// =

export default {
  async list (...args) {
    return profilesDb.list(...args)
  },

  async get (...args) {
    return profilesDb.get(...args)
  },

  async add (...args) {
    return profilesDb.add(...args)
  },

  async update (...args) {
    return profilesDb.update(...args)
  },

  async remove (...args) {
    return profilesDb.remove(...args)
  },

  async getCurrent (...args) {
    throw new Error('Not yet implemented')
    // return profilesDb.getCurrent(...args)
  },

  async setCurrent (...args) {
    throw new Error('Not yet implemented')
    // return profilesDb.setCurrent(...args)
  }

}

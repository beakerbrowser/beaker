import * as archivesDb from '../../dbs/archives'

// exported api
// =

export default {
  async list () {
    return archivesDb.listLegacyArchives()
  },

  async remove (key) {
    return archivesDb.removeLegacyArchive(key)
  }
}
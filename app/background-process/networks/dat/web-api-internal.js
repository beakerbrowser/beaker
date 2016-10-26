import { shell } from 'electron'
import log from 'loglevel'
import * as archivesDb from '../../dbs/archives'

//
// TODO all the imports here
//

export default {
  getArchiveInfo,
  getArchiveStats,
  getSavedArchives,

  resolveName,

  createNewArchive,
  forkArchive,
  setArchiveUserSettings,
  updateArchiveManifest,
  writeArchiveFileFromPath,

  swarm,
  unswarm,
  downloadArchiveEntry,
  openInExplorer,
  archivesEventStream,

  getGlobalSetting,
  setGlobalSetting
}


function openInExplorer (key) {
  var folderpath = archivesDb.getArchiveFilesPath(key)
  log.debug('[DAT] Opening in explorer:', folderpath)
  shell.openExternal('file://' + folderpath)
}
